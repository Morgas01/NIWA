(function(µ,SMOD,GMOD,HMOD,SC){

	let Path=require("path");

	let logger=require("./logger")("main");

	SC=SC({
		adopt:"adopt"
	});

	let config={
		port:null,
		welcomePage:null,
		logLevel:"INFO",
		allowCommunication:true,
		autoStart:false
	};

	SC.adopt(config,require("../config/server"));

	let workConfigPath=GMOD("niwaWorkDir")+"/config/server";
	try
	{
		let workConfig=require(workConfigPath);
		SC.adopt(config,workConfig);
	}
	catch(error)
	{
		logger.error({error:error},`could not load work config (${workConfigPath})`);
	}

	logger.info({config:config},"config");

	module.exports=config;

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
