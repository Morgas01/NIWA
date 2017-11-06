(function(µ,SMOD,GMOD,HMOD,SC){

	let Path=require("path");

	let niwaWorkDir;
	if(process.argv.length>2)
	{
		niwaWorkDir=Path.resolve(process.argv[2]);
	}
	else
	{
		niwaWorkDir=Path.resolve(__dirname,"..");
	}
	µ.setModule("niwaWorkDir",niwaWorkDir);

	let logger=require("./logger")("main");

	SC=SC({
		adopt:"adopt"
	});

	let config={
		port:null,
		welcomePage:null,
		logLevel:"INFO",
		allowCommunication:true
	};

	SC.adopt(config,require("../config/server"));

	let workConfigPath=niwaWorkDir+"/config/server";
	try
	{
		let workConfig=require(workConfigPath);
		SC.adopt(config,workConfig);
	}
	catch(error)
	{
		logger.error({error:error},`could not load work config (${workConfigPath})`);
	}

	if(process.argv.length>3)
	{
		config.port=parseInt(process.argv[3],10);
	}

	logger.info({config:config},"config");
	if(!config.port) throw "no port defined!";

	module.exports=config;

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
