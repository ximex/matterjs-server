/**
 * Legacy data loader for Python Matter Server storage files.
 *
 * Loads and provides access to data from a Python Matter Server installation:
 * - chip.json: Fabric configuration, certificates, sessions
 * - <compressedNodeId>.json: Node-specific data file
 *
 * Only supports single fabric configurations (fabric index 1).
 */

import {
    CertificateAuthorityConfiguration,
    computeCompressedNodeId,
    Crypto,
    Environment,
    LegacyFabricConfigData,
    LegacyServerFile,
    Logger,
} from "@matter-server/controller";
import { access, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ChipConfigData } from "./index.js";
import type { OperationalCredentials } from "./types.js";

const logger = Logger.get("LegacyDataLoader");

/** Result of loading legacy data */
export interface LegacyData {
    /** Chip config data (fabric certs, sessions, etc.) */
    chipConfig?: ChipConfigData;
    /** Server file data (vendor info, nodes, etc.) */
    serverFile?: LegacyServerFile;
    /** Fabric configuration extracted from chip.json (fabric index 1) */
    fabricConfig?: LegacyFabricConfigData;
    /** Operational credentials (CA/ICA keys and certs) from credential set 1 */
    operationalCredentials?: OperationalCredentials;
    /** Certificate Authority configuration (parsed from operational credentials) */
    certificateAuthorityConfig?: CertificateAuthorityConfiguration;
    /** Whether any legacy data was found */
    hasData: boolean;
    /** Error message if loading failed */
    error?: string;
}

/**
 * Load legacy Python Matter Server data from a storage directory.
 *
 * Expects:
 * - chip.json: Main configuration file with exactly one fabric (index 1)
 * - <compressedNodeId>.json: Node data file matching the fabric's compressed node ID
 *
 * @param env Environment for crypto access
 * @param storagePath Path to the storage directory
 * @returns Legacy data if found and valid, or result with error
 */
export async function loadLegacyData(env: Environment, storagePath: string): Promise<LegacyData> {
    const result: LegacyData = {
        hasData: false,
    };

    // Check if storage directory exists
    try {
        await access(storagePath);
    } catch {
        logger.debug(`Storage directory not found: ${storagePath}`);
        return result;
    }

    // Try to load chip.json
    const chipJsonPath = join(storagePath, "chip.json");
    let chipConfig: ChipConfigData;
    try {
        await access(chipJsonPath);
        chipConfig = new ChipConfigData();
        await chipConfig.load(chipJsonPath);
        result.chipConfig = chipConfig;
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
            result.error = `Error loading chip.json: ${err}`;
            logger.warn(result.error);
        } else {
            logger.debug(`No chip.json found at ${chipJsonPath}`);
        }
        return result;
    }

    logger.info(`Loaded legacy chip.json with ${chipConfig.fabrics.size} fabric(s)`);

    // Validate: we expect exactly one fabric with index 1
    const fabricIndices = chipConfig.getFabricIndices();
    if (fabricIndices.length !== 1 || fabricIndices[0] !== 1) {
        result.error = `Expected exactly one fabric with index 1, found indices: [${fabricIndices.join(", ")}]`;
        logger.error(result.error);
        return result;
    }

    // Extract fabric config for index 1
    const fabricConfig = chipConfig.getFabricConfig(1);
    if (!fabricConfig) {
        result.error = "Failed to extract fabric config for index 1";
        logger.error(result.error);
        return result;
    }
    result.fabricConfig = fabricConfig;
    result.hasData = true;
    logger.debug(`Extracted fabric config: fabricId=${fabricConfig.fabricId}, nodeId=${fabricConfig.nodeId}`);

    // Extract operational credentials (credential set 1)
    const credIndices = chipConfig.getOperationalCredentialsIndices();
    if (credIndices.length > 0) {
        // Prefer credential set 1, fall back to first available
        const credIndex = credIndices.includes(1) ? 1 : credIndices[0];
        const creds = chipConfig.getOperationalCredentials(credIndex);
        if (creds) {
            result.operationalCredentials = creds;
            logger.debug(`Extracted operational credentials from set ${credIndex}`);

            // Also extract CertificateAuthority.Configuration
            const caConfig = await chipConfig.getCertificateAuthorityConfig(credIndex);
            if (caConfig) {
                result.certificateAuthorityConfig = caConfig;
                logger.debug(
                    `Extracted CA config: rootCertId=${caConfig.rootCertId}, hasIcac=${caConfig.icacCertBytes !== undefined}`,
                );
            }
        }
    }

    // Compute the compressed fabric ID to find the server data file
    const crypto = env.get(Crypto);
    const compressedFabricId = await computeCompressedNodeId(crypto, fabricConfig.fabricId, fabricConfig.rootPublicKey);
    const serverFileName = `${compressedFabricId}.json`;
    const serverFilePath = join(storagePath, serverFileName);

    logger.debug(`Looking for server data file: ${serverFileName}`);

    // Try to load the server data file
    try {
        await access(serverFilePath);
        const content = await readFile(serverFilePath, "utf-8");
        const serverFile = JSON.parse(content) as LegacyServerFile;
        result.serverFile = serverFile;

        const nodeCount = Object.keys(serverFile.nodes).length;
        logger.info(
            `Loaded legacy server data from ${serverFileName}: ${nodeCount} node(s), last_node_id=${serverFile.last_node_id}`,
        );
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
            logger.warn(`Error loading server file ${serverFileName}: ${err}`);
        } else {
            logger.debug(`No server data file found at ${serverFilePath}`);
        }
        // Server data file is optional, don't fail
    }

    return result;
}

/**
 * Check if a storage directory contains legacy Python Matter Server data.
 *
 * @param storagePath Path to the storage directory
 * @returns true if chip.json exists
 */
export async function hasLegacyData(storagePath: string): Promise<boolean> {
    try {
        await access(join(storagePath, "chip.json"));
        return true;
    } catch {
        return false;
    }
}

/**
 * Save the legacy server file back to disk.
 *
 * @param env Environment for crypto access
 * @param storagePath Path to the storage directory
 * @param fabricConfig Fabric configuration (needed to compute the file name)
 * @param serverFile The server file data to save
 */
export async function saveLegacyServerFile(
    env: Environment,
    storagePath: string,
    fabricConfig: LegacyFabricConfigData,
    serverFile: LegacyServerFile,
): Promise<void> {
    const crypto = env.get(Crypto);
    const compressedFabricId = await computeCompressedNodeId(crypto, fabricConfig.fabricId, fabricConfig.rootPublicKey);
    const serverFileName = `${compressedFabricId}.json`;
    const serverFilePath = join(storagePath, serverFileName);

    const content = JSON.stringify(serverFile, null, 2);
    await writeFile(serverFilePath, content, "utf-8");

    const nodeCount = Object.keys(serverFile.nodes).length;
    logger.info(
        `Saved server data to ${serverFileName}: ${nodeCount} node(s), last_node_id=${serverFile.last_node_id}`,
    );
}
