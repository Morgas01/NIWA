let µ=require("Morgas");
(function(µ,SMOD,GMOD,HMOD,SC){

	SC=SC({
		File:"File",
		fileUtils:"File.util",
		es:"errorSerializer"
	});

	let bunyan=require("bunyan");

	let logFolder=new SC.File(__dirname).changePath("logs");
	let loggers=new Map();

	module.exports=function(name)
	{
		if(!loggers.has(name))
		{
			let logFile=logFolder.clone().changePath(name+".log");
			SC.fileUtils.enshureDirSync(logFile.clone().changePath(".."));
			loggers.set(name,bunyan.createLogger({
				name:name,
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
		µ.logger.out=function(level,msg)
		{
			let fn;
			switch(level)
			{
				case µ.logger.LEVEL.error:
					fn=coreLogger.error;
					break;
				case µ.logger.LEVEL.warn:
					fn=coreLogger.warn;
					break;
				case µ.logger.LEVEL.info:
					fn=coreLogger.info;
					break;
				default:
					fn=coreLogger.debug;
			}
			fn.apply(coreLogger,msg);
		};
		return coreLogger;
	};

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
