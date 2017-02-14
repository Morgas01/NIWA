(function(µ,SMOD,GMOD,HMOD,SC){

	SC=SC({
		File:"File",
		util:"File.util",
		Config:"Config"
	});

	module.exports=function(config)
	{
		if(!(config instanceof SC.Config)) config=SC.Config.parse(config);

		var ready=SC.util.enshureDir(new SC.File(__dirname).changePath("../config"))
		.then(function()
		{
			var configFile=folder.clone().changePath(worker.name+".config.json");
			return SC.util.getRotatedFile(configFile,JSON.parse)
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
				config.setAll(result.data,true);
				return config;
			}, errors=>µ.logger.warn({errors:errors},"could not load config"));
		});

		var rtn=function(param)
		{
			switch(param.method)
			{
				default:
				case "GET":
					var c=config;
					if(param.path.length>0)
					{
						var c=config.get(param.path.map(decodeURIComponent));
						if(!c)
						{
							param.status=404;
							return "not found "+param.path.join("/");
						}
					}
					return c.toJSON();
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
							setImmediate(rtn.notify,param.data.key,oldValue,field.get());
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
		rtn.ready=ready;
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
		rtn.notify=function(key, oldValue, newValue)
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
						µ.error({error:e},"error in notify callback");
					}
				}
			}
		};

		return rtn;
	};

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
