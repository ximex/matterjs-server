# Open Home Foundation Matter(.js) Server

![Matter Logo](https://github.com/matter-js/matterjs-server/raw/main/docs/matter_logo.svg)

This project implements a Matter Controller Server over WebSockets using JavaScript Matter SDK [matter.js](https://github.com/matter-js/matter.js)
as a base and provides both a server and client implementation.

The Open Home Foundation Matter Server software component is a project of the [The Open Home Foundation](https://www.openhomefoundation.org/).

Please refer to https://github.com/matter-js/matterjs-server/blob/main/README.md for more information.

## Dashboard

The dashboard will be available at [http://localhost:5010](http://localhost:5010). When you open it from localhost, it will ask you for your websocket server URL.

The websocket URL of the Home Assistant add-on will be something like `ws://homeassistant.local:5580`. If you are running the Python Matter Server locally, it will be `ws://localhost:5580`.

If you want to use the dashboard with the Python Matter Server Home Assistant add-on, you need to configure it to make the WebSocket server available on the network. Go to the [add-on info page](https://my.home-assistant.io/redirect/supervisor_addon/?addon=core_matter_server), click on Configuration. Under "Network", show disabled ports and enter the port you want to use for the WebSocket server (e.g. 5580). Then, click "save" and restart the add-on when prompted.
