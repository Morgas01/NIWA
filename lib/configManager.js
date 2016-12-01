var µ=require("Morgas");
var gui=require("MorgasGui");
(function(µ,SMOD,GMOD,HMOD,SC){

	var SC=µ.shortcut({
		File:"File",
		util:"File.util",
		Config:"Config"
	});

	module.exports=function(config)
	{
		if(!(config instanceof SC.Config)) config=SC.Config.parse(config);
		var configFile=new SC.File(__dirname).changePath("../config/"+worker.name+".config.json");
		SC.util.getRotatedFile(configFile,JSON.parse)
		.then(result=>
		{
			if(result.others.length>0)
			{
				for(var other of result.others)
				{
					µ.logger.warn({error:other.error,file:other.file.getAbsolutePath()},"error loading config");
				}
				µ.logger.warn("load file "+result.file.getAbsolutePath()+" instead")
			}
			config.setAll(result.data,true)
		}, errors=>µ.logger.warn({errors:errors},"could not load config"));

		var rtn=function(param)
		{
			switch(param.method)
			{
				default:
				case "GET":
					return config.toJSON();
					break;
				case "POST":
					var field=param.data.key&&config.get(param.data.key);
					if(field)
					{
						var oldValue=field.get();
						if(field.set(param.data.value))
						{
							return configFile.exists().then(()=>SC.util.rotateFile(configFile,3),()=>null)
							.then(()=>configFile.write(JSON.stringify(config)))
							.then(()=>({result:true}));
							setImmediate(notify,param.data.key,oldValue,field.get());
						}
					}
					return {
						result:false,
						error:(field?"value refused":"field not found"),
						usage:String.raw
`{String|String[]} key
{*} value`
					};
				case "OPTIONS":
					return {
						description:config.toDescription(),
						value:config.toJSON()
					};
			}
		};
		var listeners=new Map();
		rtn.addListener=function(key,fn)
		{
			if(!listeners.has(key)) listeners.set(key,new Set());
			listeners.get(key).add(fn);
		};
		rtn.removeListener=function(key,fn)
		{
			if(listeners.has(key))
			{
				listeners.get(key).delete(fn);
			}
		};
		var notify=function(key, oldValue, newValue)
		{
			if(listeners.has(key))
			{
				for(var callback of listeners.get(key))
				{
					try
					{
						callback({
							oldValue:oldValue,
							newValue:newValue
						});
					}
					catch(e)
					{
						µ.warn({error:e},"error in notify callback");
					}
				}
			}
		}

		return rtn;
	};

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
