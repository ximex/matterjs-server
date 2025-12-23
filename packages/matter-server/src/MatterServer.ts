import {
    ConfigStorage,
    Environment,
    LegacyServerData,
    Logger,
    MatterController,
    WebSocketControllerHandler,
} from "@matter-server/controller";
import { getCliOptions } from "./cli.js";
import { type LegacyData, loadLegacyData } from "./converter/LegacyDataLoader.js";
import { StaticFileHandler } from "./server/StaticFileHandler.js";
import { WebServer } from "./server/WebServer.js";

const logger = Logger.get("MatterServer");

// Parse CLI options
const cliOptions = getCliOptions();

const env = Environment.default;

// Apply CLI options to environment variables
env.vars.set("storage.path", cliOptions.storagePath);
if (cliOptions.bluetoothAdapter !== null) {
    env.vars.set("ble.enable", true);
    env.vars.set("ble.hci.id", cliOptions.bluetoothAdapter);
}
if (cliOptions.primaryInterface) {
    env.vars.set("mdns.networkInterface", cliOptions.primaryInterface);
}

let controller: MatterController;
let server: WebServer;
let config: ConfigStorage;
let legacyData: LegacyData;

async function start() {
    const legacyServerData: LegacyServerData = {
        vendorId: cliOptions.vendorId,
        fabricId: cliOptions.fabricId,
    };

    // Check for and load legacy Python Matter Server data
    legacyData = await loadLegacyData(env, cliOptions.storagePath);
    if (legacyData.error) {
        logger.warn(`Legacy data error: ${legacyData.error}`);
    }
    if (legacyData.hasData) {
        const parts: string[] = [];
        if (legacyData.fabricConfig) {
            parts.push("1 fabric");
            legacyServerData.fabric = legacyData.fabricConfig;
            logger.info("Fabric", legacyServerData.fabric);
        }
        if (legacyData.serverFile) {
            const nodeCount = Object.keys(legacyData.serverFile.nodes).length;
            legacyServerData.nodeData = legacyData.serverFile;
            parts.push(`${nodeCount} node(s)`);
        }
        if (legacyData.certificateAuthorityConfig) {
            parts.push("CA credentials");
            legacyServerData.credentials = legacyData.certificateAuthorityConfig;
            logger.info("Credentials", legacyServerData.credentials);
        }
        logger.info(`Found legacy data: ${parts.join(", ")}`);
    }

    config = await ConfigStorage.create(env);
    controller = await MatterController.create(env, config, legacyServerData);

    server = new WebServer({ listenAddresses: cliOptions.listenAddress, port: cliOptions.port }, [
        new WebSocketControllerHandler(controller.commandHandler, config),
        new StaticFileHandler(),
    ]);

    await server.start();
}

async function stop() {
    await server?.stop();
    await controller?.stop();
    await config?.close();
    process.exit(0);
}

start();

process.on("SIGINT", () => void stop().catch(err => console.error(err)));
process.on("SIGTERM", () => void stop().catch(err => console.error(err)));
