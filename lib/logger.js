(function(µ,SMOD,GMOD,HMOD,SC){

	let bunyan=require("bunyan");

	SC=SC({
		File:"File",
		fileUtils:"File/util",
		es:"errorSerializer"
	});


	module.exports=function(dir,filename,name,level=bunyan.INFO)
	{
		let logFolder=new SC.File(dir).changePath("logs");
		let logFile=logFolder.clone().changePath(filename+".log");
		SC.fileUtils.enshureDirSync(logFolder);
		return bunyan.createLogger({
			name:name,
			level:level,
			streams:[
				{stream: process.stdout},
				{
					type: "rotating-file",
					path:logFile.getAbsolutePath(),
					period:"1d",
					count:7
				}
			],
			serializers: {
				error: SC.es
			}
		});
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
		µ.logger.setLevel(µ.logger.LEVEL[level.toLowerCase()]);
		for(let logger of loggers.values())
		{
			logger.level(defaultLevel);
		}
	};

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
