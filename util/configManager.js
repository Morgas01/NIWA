(function(µ,SMOD,GMOD,HMOD,SC){

	SC=SC({
		File:"File",
		util:"File.util",
		Config:"Config"
	});

	module.exports=function(config)
	{
		if(!(config instanceof SC.Config)) config=SC.Config.parse(config);
		var folder=new SC.File(__dirname).changePath("../config");
		var configFile=folder.clone().changePath(worker.name+".config.json");
		var ready=SC.util.enshureDir(folder)
		.then(function()
		{
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
			})
			.catch(function(error)
			{
				µ.logger.warn({error:error},"could not load config");
				return config;
			});
		});

		var api=function(param)
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
					var field=param.data.path&&config.get(param.data.path);
					if(field)
					{
						var oldValue=field.get();
						if(field.set(param.data.value))
						{
							var p=api.save();
							setImmediate(api.notify,param.data.key,oldValue,field.get());
							return p;
						}
					}
					return {
						result:false,
						error:(field?"value refused":"field not found"),
						usage:String.raw
`{String|String[]} path
{*} value`
					};
				case "OPTIONS":
					return {
						description:config.toDescription(),
						value:config.toJSON()
					};
				case "PUT":
					var error="undefined";
					var container=param.data.path&&config.get(param.data.path);
					if(container)
					{
						if( container instanceof SC.Config.Container.Object)
						{
							if(container.get(param.data.key))error="key in use";
							else {
								var c=container.add(param.data.key,param.data.field);
								if(c)
								{
									if(param.data.value!==undefined) c.set(param.data.value);
									return {
										result:true
									}
								}
								else error="bad or no field";
							}
						}
						else if( container instanceof SC.Config.Container.Array)
						{
							if(param.data.key==container.length)
							{
								return {
									result:!!container.push(param.data.value)
								};
							}
							else if (param.data.key<container.length) error="key in use";
							else error="key out of bounds";
						}
						else if( container instanceof SC.Config.Container.Map)
						{
							if(!container.get(param.data.key))
							{
								return {
									result:!!container.add(param.data.key,param.data.value)
								};
							}
							else error="key in use";
						}
					}
					else error="container not found";
					return {
						result:false,
						error:error,
						usage:String.raw
`{String|String[]} path
{String} key
{*} [value]
{Object} [field] - only when container is Config.Object`
					};
				case "DELETE":
					var error="undefined";
					var container=param.data.path&&config.get(param.data.path);
					if(container)
					{
						if( container instanceof SC.Config.Container.Object)
						{
							return {
								result:container.remove(param.data.key)
							};
						}
						else if( container instanceof SC.Config.Container.Array)
						{
							return {
								result:container.splice(param.data.key)
							};
						}
						else if( container instanceof SC.Config.Container.Map)
						{
							return {
								result:container.remove(param.data.key)
							};
						}
					}
					else error="container not found";
					return {
						result:false,
						error:error,
						usage:String.raw
`{String|String[]} path
{String} key`
					};
			}
		};
		api.ready=ready;
		var listeners=new Map();
		api.addListener=function(key,fn)
		{
			if(!listeners.has(key)) listeners.set(key,new Set());
			listeners.get(key).add(fn);
		};
		api.removeListener=function(key,fn)
		{
			if(listeners.has(key))
			{
				listeners.get(key).delete(fn);
			}
		};
		api.notify=function(key, oldValue, newValue)
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
		api.save=function()
		{
			return configFile.exists().then(()=>SC.util.rotateFile(configFile,3),()=>null)
			.then(()=>configFile.write(JSON.stringify(config)))
			.then(()=>({result:true}));
		}

		return api;
	};

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
