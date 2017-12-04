require("Morgas");
let PATH=require("path");
module.exports=function(niwaWorkDir=__dirname,overridePort=null)
{

	µ.setModule("niwaWorkDir",PATH.resolve(niwaWorkDir));

	let LOG=require("./lib/logger");
	LOG.setCoreLogger(LOG("main"));

	let config=require("./lib/config");
	if(overridePort) config.port=overridePort;
	else if(!config.port) throw "no port defined!";
	LOG.setLevel(config.logLevel);

	let startServer=require("./lib/startServer");
	let backGardener=require("./lib/backGardener");

	let rtn=startServer(config.port)
	.then(backGardener.initApps);

    rtn.catch(µ.logger.error);
    return rtn;
};
