import { ConfigStorage, Environment, MatterController, WebSocketControllerHandler } from "@matter-server/controller";
import { getCliOptions } from "./cli.js";
import { StaticFileHandler } from "./server/StaticFileHandler.js";
import { WebServer } from "./server/WebServer.js";

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

async function start() {
    config = await ConfigStorage.create(env);
    controller = await MatterController.create(env, config);

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

start().catch(err => {
    console.error(err);
    process.exit(1);
});

process.on("SIGINT", () => void stop().catch(err => console.error(err)));
process.on("SIGTERM", () => void stop().catch(err => console.error(err)));
