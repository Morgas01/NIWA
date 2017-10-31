(function(µ,SMOD,GMOD,HMOD,SC){

	let bunyan=require("bunyan");

	SC=SC({
		File:"File",
		fileUtils:"File.util",
		es:"errorSerializer"
	});

	let logFolder=new SC.File(GMOD("niwaWorkDir")).changePath("logs");
	let loggers=new Map();
	let defaultLevel=bunyan.INFO;

	module.exports=function(name)
	{
		if(!loggers.has(name))
		{
			let logFile=logFolder.clone().changePath(name+".log");
			SC.fileUtils.enshureDirSync(logFile.clone().changePath(".."));
			loggers.set(name,bunyan.createLogger({
				name:name,
				level:defaultLevel,
				streams:[
					{stream: process.stdout},
					{
						type: "rotating-file",
						path:logFile.filePath,
						period:"1d",
						count:7
					}
				],
				serializers: {
					error: SC.es
				}
			}));
		}
		return loggers.get(name);
	};

	module.exports.setCoreLogger=function(coreLogger)
	{
		µ.logger.out=function(verbose,msg)
		{
			let fn;
			if(verbose<=µ.logger.LEVEL.error) fn=coreLogger.error;
			else if(verbose<=µ.logger.LEVEL.warn) fn=coreLogger.warn;
			else if(verbose<=µ.logger.LEVEL.info) fn=coreLogger.info;
			else fn=coreLogger.debug;

			fn.apply(coreLogger,msg);
		};
		return coreLogger;
	};

	module.exports.setLevel=function(level)
	{
		defaultLevel=bunyan[level];
		for(let logger of loggers.values())
		{
			logger.level(defaultLevel);
		}
	};

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
