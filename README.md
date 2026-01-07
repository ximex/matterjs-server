# Open Home Foundation Matter Server

![Matter Logo](docs/matter_logo.svg)

The Open Home Foundation Matter Server is an [officially certified](https://csa-iot.org/csa_product/open-home-foundation-matter-server/) Software Component to create a Matter controller. It serves as the foundation to provide Matter support to [Home Assistant](https://home-assistant.io) but its universal approach makes it suitable to be used in other projects too.

This project implements a Matter Controller Server over WebSockets using the
[official Matter (formerly CHIP) SDK](https://github.com/project-chip/connectedhomeip)
as a base and provides both a server and client implementation.

> [!IMPORTANT]
> We’re excited to share that the Matter Server is being rewritten on top of [matter.js](https://github.com/matter-js/matter.js)! 🎉
> This means that the current project has moved into **maintenance mode** — we’ll still fix important bugs if they come up, but all new features will land in the new project instead.
> We’ll post a link as soon as the first **alpha version** is ready for you to try out. 🚀

The Open Home Foundation Matter Server software component is funded by [Nabu Casa](https://www.nabucasa.com/) (a member of the CSA) and donated to [The Open Home Foundation](https://www.openhomefoundation.org/).

## Support

For developers, making use of this component or contributing to it, use the issue tracker within this repository and/or reach out on discord.

For users of Home Assistant, seek support in the official Home Assistant support channels.

- The Home Assistant [Community Forum](https://community.home-assistant.io/).
- The Home Assistant [Discord Chat Server](https://discord.gg/c5DvZ4e).
- Join [the Reddit subreddit in /r/homeassistant](https://reddit.com/r/homeassistant).

- If you experience issues using Matter with Home Assistant, please open an issue
  report in the [Home Assistant Core repository](https://github.com/home-assistant/core/issues/new/choose).

Please do not create Home Assistant enduser support issues in the issue tracker of this repository.

## Development

Want to help out with development, testing, and/or documentation? Great! As both this project and Matter keeps evolving there will be a lot to improve. Reach out to us on discord if you want to help out.

[Development documentation](DEVELOPMENT.md)

## Installation / Running the Matter Server

- Endusers of Home Assistant, refer to the [Home Assistant documentation](https://www.home-assistant.io/integrations/matter/) how to run Matter in Home Assistant using the official Matter Server add-on, which is based on this project.

- For running the server and/or client in your development environment, see the [Development documentation](DEVELOPMENT.md).

- For running the Matter Server as a standalone docker container, see our instructions [here](docs/docker.md).

> [!NOTE]
> Both Matter and this implementation are in an early state and features are probably missing or could be improved. See our [development notes](#development) how you can help out, with development and/or testing.










This is a WIP version of a Matter.js based controller with a Python Matter Server compatible WebSocket interface.

## How to use
* clone the repository
* `npm i` in the root directory to install npm dependencies and do initial build
* (`npm run build`) if ever needed after changing code
* `npm run server` to start it

The server is started on port localhost:5580 and listens fpr WS on "/ws".

Just configure the HA instance against this server and have fun :-)

### Tips
* to control the storage directory use `--storage-path=.ha1` as parameter to use local dir `.ha1` for storage
* to limit network interfaces (especially good idea on Macs sometimes) use  `--mdns-networkinterface=en0`

So as example to do both use `npm run server -- --storage-path=.ha1 --mdns-networkinterface=en0` (note the extra "--" to pass parameters to the script).

It was in general tested with a simply slight bulb on network.

Ble and Wifi should work when server gets startes with `--ble` flag, but Wifi only will work. For Thread Mater.js currently requires a network Name which is not provided.

## Differences from Python Matter Server

This implementation aims to be API-compatible with the [Python Matter Server](https://github.com/home-assistant-libs/python-matter-server), but there are some intentional differences:

### Test Node ID Range

Test nodes (imported via `import_test_node` command) use different ID ranges:

| Implementation | Test Node ID Range |
|----------------|-------------------|
| Python Matter Server | `>= 900000` (0xDBBA0) |
| Matter.js Server | `>= 0xFFFF_FFFE_0000_0000` |

The Matter.js implementation uses the high 64-bit range to ensure test node IDs never collide with real Matter node IDs, which can be assigned values up to 64-bit. This is a deliberate design choice for better separation between test and production nodes.

**Note**: If you're importing diagnostics dumps from a Python Matter Server instance, the test node IDs will be preserved as-is from the dump.

### Fabric Label Handling

When setting the fabric label via `set_default_fabric_label`:

| Implementation | Behavior with null/empty |
|----------------|-------------------------|
| Python Matter Server | Auto-truncates to 32 chars, accepts null/empty to clear |
| Matter.js Server | Resets to "Home" when null or empty string is passed |

The matter.js SDK requires fabric labels to be 1-32 characters, so the Matter.js server uses "Home" as the default label instead of clearing it.

### Eve Energy Custom Cluster Polling

The Python Matter Server includes a polling mechanism for older Eve Energy devices that report power consumption via a custom vendor cluster (0x130AFC01) instead of the standard `ElectricalPowerMeasurement` cluster.

| Implementation | Behavior |
|----------------|----------|
| Python Matter Server | Polls Eve energy attributes (Watt, Voltage, Current, etc.) every 30 seconds if the device is from Eve (vendor ID 4874) and lacks the standard power cluster |
| Matter.js Server | Does not implement this polling mechanism |

**Why this difference exists**: Modern Eve devices with up-to-date firmware use the standard Matter `ElectricalPowerMeasurement` cluster, which supports proper subscriptions and doesn't require polling. The polling in Python was a workaround for older firmware versions.

**Recommendation**: If you have Eve Energy devices that don't report power values correctly, update your device firmware through the Eve app. Updated firmware uses standard Matter clusters that work correctly without polling.

For complete compatibility details, see [TODO.md](TODO.md).
