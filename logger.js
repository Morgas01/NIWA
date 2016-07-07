(function(µ,SMOD,GMOD,HMOD,SC){
		
	SC=SC({
		File:"File",
		fileUtils:"File.util"
	})
	
	var bunyan=require("bunyan");
	
	var logFolder=new SC.File(__dirname).changePath("logs");
	var loggers=new Map();

	module.exports=function(name)
	{
		if(!loggers.has(name))
		{
			loggers.set(name,bunyan.createLogger({
				name:name,
				streams:[
					{stream: process.stdout},
					{
						type: "rotating-file",
						path:logFolder.clone().changePath(name+".log").filePath,
						period:"1d",
						count:7
					}
				],
				serializers: {
					error: module.exports.errorSerializer
				}
			}));
		}
		return loggers.get(name);
	};
	module.exports.errorSerializer=function(error)
	{
		if(error instanceof Error)
			return {
				name:error.name,
				message:error.message,
				stack:error.stack
			};
		return error
	};
	
	module.exports.setCoreLogger=function(coreLogger)
	{
		µ.logger.out=function(level,msg)
		{
			var fn;
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