(function(µ,SMOD,GMOD,HMOD,SC){

	SC=SC({
		File:"File",
		util:"File.util",
		Config:"Config",
		eq:"equals",
		ServiceResult:"ServiceResult"
	});

	module.exports=function(config)
	{
		if(!(config instanceof SC.Config)) config=SC.Config.parse(config);
		let folder=new SC.File(__dirname).changePath("../config");
		let configFile=folder.clone().changePath(worker.context+".config.json");
		let ready=SC.util.enshureDir(folder)
		.then(function()
		{
			return SC.util.getRotatedFile(configFile,JSON.parse)
			.then(result=>
			{
				if(result.others.length>0)
				{
					for(let other of result.others)
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

		let api=function(param)
		{
			switch(param.method)
			{
				default:
				case "GET":
				{
					let c=config;
					if(param.path.length>0)
					{
						let c=config.get(param.path.map(decodeURIComponent));
						if(!c)
						{
							return new SC.ServiceResult({data:"not found "+param.path.join("/"),status:404});
						}
					}
					return c.toJSON();
					break;
				}
				case "POST":
				{
					let field=param.data.path&&config.get(param.data.path);
					let setCheck=false;
					if(field)
					{
						let oldValue=field.get();
						setCheck=field.set(param.data.value)
						if(setCheck===true)
						{
							let p=api.save();
							setImmediate(api.notify,param.data.path,oldValue,field.get());
							return p;
						}
					}
					return {
						result:false,
						error:(setCheck?setCheck:(field?"value refused":"field not found")),
						usage:String.raw
`{String|String[]} path
{*} value`
					};
				}
				case "OPTIONS":
				{
					let c=config;
					if(param.path.length>0)
					{
						c=config.get(param.path.map(decodeURIComponent));
						if(!c)
						{
							return new SC.ServiceResult({data:"not found "+param.path.join("/"),status:404});
						}
					}
					return {
						description:c.toDescription(),
						value:c.toJSON()
					};
				}
				case "PUT":
				{
					let container=param.data.path&&config.get(param.data.path);
					let rtn={
						result:false,
						error:"undefined",
						usage:String.raw
`{String|String[]} path
{String} key
{*} [value]
{Object} [field] - only when container is Config.Object`
					};
					if(container)
					{
						if( container instanceof SC.Config.Container.Object)
						{
							if(container.get(param.data.key))error="key in use";
							else {
								let c=container.add(param.data.key,param.data.field);
								if(c)
								{
									if(param.data.value!==undefined) c.set(param.data.value);
									rtn.result=true;
								}
								else rtn.error="bad or no field";
							}
						}
						else if( container instanceof SC.Config.Container.Array)
						{
							if(param.data.key==container.length)
							{
								rtn.result=!!container.push(param.data.value);
							}
							else if (param.data.key<container.length) rtn.error="key in use";
							else rtn.error="key out of bounds";
						}
						else if( container instanceof SC.Config.Container.Map)
						{
							if(!container.get(param.data.key))
							{
								rtn.result=!!container.add(param.data.key,param.data.value);
							}
							else rtn.error="key in use";
						}
					}
					else
					{
						rtn.error="container not found";
					}

					if(rtn.result) return api.save();
					return rtn;
				}
				case "DELETE":
				{
					let error="undefined";
					let container=param.data.path&&config.get(param.data.path);
					let result=false;
					if(container)
					{
						if( container instanceof SC.Config.Container.Object)
						{
							result=container.remove(param.data.key);
						}
						else if( container instanceof SC.Config.Container.Array)
						{
							result=container.splice(param.data.key);
						}
						else if( container instanceof SC.Config.Container.Map)
						{
							result=container.remove(param.data.key);
						}
					}
					else error="container not found";

					if(result) return api.save();
					return {
						result:false,
						error:error,
						usage:String.raw
`{String|String[]} path
{String} key`
					};
				}
			}
		};
		api.ready=ready;
		let listeners=[];
		api.addListener=function(path,fn)
		{
			listeners.push({path:[].concat(path),fn:fn});
		};
		api.removeListener=function(pathOfFn,fn)
		{
			for(let i=listeners.length-1;i>=0;i--)
			{
				let entry=listeners[i];
				let pathEqual=pathOfFn.length==entry.path.length&&entry.path.every((item,index)=>pathOfFn[index]==item);
				if(!fn&&(pathEqual||pathOfFn===entry.fn)||
					(pathEqual&&fn==entry.fn))
				{
					listeners.splice(i,1);
				}
			}
		};
		api.notify=function(path, oldValue, newValue)
		{
			for(let listener of listeners)
			{
				try
				{
					if(SC.eq(path,listener.path))
						listener.fn(newValue,oldValue);
				}
				catch(e)
				{
					µ.logger.error({error:e},"error in notify callback");
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
