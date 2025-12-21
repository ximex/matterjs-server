# Matter Server CLI

Matter Controller Server using WebSockets.

## Usage

```bash
# Start server with defaults
npm run server

# With options
npm run server -- --port 5580 --storage-path ~/.matter_server

# Bind to specific interface
npm run server -- --listen-address 192.168.1.100

# Enable BLE commissioning (Linux with bluetooth adapter)
npm run server -- --bluetooth-adapter 0
```

---

## Complete Argument Specification

| Argument                      | Type         | Default                | Required | Description                                          |
|-------------------------------|--------------|------------------------|----------|------------------------------------------------------|
| --vendorid                    | integer      | 0xFFF1 (65521)         | No       | Vendor ID for the Fabric                             |
| --fabricid                    | integer      | 1                      | No       | Fabric ID for the Fabric                             |
| --storage-path                | string       | ~/.matter_server       | No       | Storage path to keep persistent data                 |
| --port                        | integer      | 5580                   | No       | TCP Port for WebSocket server                        |
| --listen-address              | string[]     | null (bind all)        | No       | IP address(es) to bind WebSocket server. Repeatable. |
| --log-level                   | enum         | "info"                 | No       | Global logging level                                 |
| --log-level-sdk               | enum         | "error"                | No       | Matter SDK logging level                             |
| --log-file                    | string       | null                   | No       | Log file path (optional)                             |
| --primary-interface           | string       | null                   | No       | Primary network interface for link-local addresses   |
| --paa-root-cert-dir           | string       | null                   | No       | Directory for PAA root certificates                  |
| --enable-test-net-dcl         | boolean flag | false                  | No       | Enable test-net DCL certificates                     |
| --bluetooth-adapter           | integer      | null                   | No       | Bluetooth adapter HCI ID (e.g., 0 for hci0)          |
| --log-node-ids                | integer[]    | null                   | No       | Node IDs to filter logs (space-separated)            |
| --ota-provider-dir            | string       | null                   | No       | Directory for OTA Provider files                     |
| --disable-server-interactions | boolean flag | false                  | No       | Disable server cluster interactions                  |

---

## Enum Values

**--log-level** (case-insensitive):
- critical
- error
- warning
- info (default)
- debug
- verbose

**--log-level-sdk**:
- none
- error (default)
- progress
- detail
- automation

---

## Multi-Value Arguments

Two arguments accept multiple values:

1. **--listen-address** - Repeatable flag pattern:
   ```bash
   npm run server -- --listen-address 192.168.1.100 --listen-address "::1"
   ```

2. **--log-node-ids** - Space-separated list:
   ```bash
   npm run server -- --log-node-ids 1 2 3
   ```

---

## Bluetooth Adapter (BLE Commissioning)

The `--bluetooth-adapter` option enables BLE commissioning for Matter devices. It expects the **HCI ID** (integer) of your Bluetooth adapter, not a device path.

### Finding Your HCI ID

On Linux, list available Bluetooth adapters:

```bash
# Using hciconfig
hciconfig -a

# Or check sysfs
ls /sys/class/bluetooth/
# Output: hci0  hci1  ...
```

The number after `hci` is the ID to use:
- `hci0` → `--bluetooth-adapter 0`
- `hci1` → `--bluetooth-adapter 1`

### Example

```bash
# Enable BLE commissioning with the first Bluetooth adapter (hci0)
npm run server -- --bluetooth-adapter 0
```

### Note

This is different from Thread Border Routers which use serial device paths (e.g., `/dev/ttyUSB0`). BLE commissioning uses the system's Bluetooth HCI interface.

---

## Implementation Notes

### Currently Applied Options

These CLI options are directly applied to the server:

| Option              | Applied To                                        |
|---------------------|---------------------------------------------------|
| --port              | WebServer bind port                               |
| --listen-address    | WebServer bind address(es)                        |
| --storage-path      | Environment `storage.path`                        |
| --bluetooth-adapter | Environment `ble.enable` + `ble.hci.id`           |
| --primary-interface | Environment `mdns.networkInterface`               |

### Options Available for Future Use

These options are parsed and available via `getCliOptions()` from `cli.ts`:

- `vendorId`, `fabricId` - Fabric configuration
- `logLevel`, `logLevelSdk`, `logFile`, `logNodeIds` - Logging configuration
- `paaRootCertDir`, `enableTestNetDcl` - Certificate configuration
- `otaProviderDir` - OTA update configuration
- `disableServerInteractions` - Server behavior

### TypeScript Interface

```typescript
import { getCliOptions, CliOptions } from "./cli.js";

const options: CliOptions = getCliOptions();
```

---

## Python Matter Server Compatibility

This CLI is designed to be compatible with the Python Matter Server CLI interface.

### Environment Variables (Python-specific)

| Variable               | Purpose                           | Type                     |
|------------------------|-----------------------------------|--------------------------|
| PYTHONDEBUG            | Enables debug mode in event loop  | boolean (presence check) |
| MATTER_VERBOSE_LOGGING | Enables verbose logging in client | boolean (presence check) |

---

## Storage Format

Mounted e.g. in /data:
- `NODEID.json` - Node data
- `NODEID.json.backup` - Node data backup
- `chip.json` - Chip configuration
- `/credentials` - All certs (will be ignored)
- `/updates` - Manually added OTA files (import on server start)
