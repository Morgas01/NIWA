require("Morgas");

let config=require("./lib/config");
let LOG=require("./lib/logger");
let startServer=require("./lib/startServer");
let backGardener=require("./lib/backGardener");

LOG.setLevel(config.logLevel);
LOG.setCoreLogger(LOG("main"));

startServer(config.port)
.then(backGardener.initApps)
.catch(µ.logger.error);
