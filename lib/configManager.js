var µ=require("Morgas");
var gui=require("MorgasGui");
(function(µ,SMOD,GMOD,HMOD,SC){

	var SC=µ.shortcut({
		File:"File",
		util:"File.util",
		Config:"Config"
	});
	/**
	 * @typedef {Object} configSetting
	 * @property {String} type - "string", "boolean", "number" or "select"
	 * @property {*} [value=null] - default value
	 * @property {*|*[]} [values=null] - possible values for select type
	 */

	/**
	 * @param {Object} configSettings.<String, String|configSetting> - dictionary of config attributes
	 * possible strings : "string","boolean","number","select"
	 */
	module.exports=function(config)
	{
		if(!(config instanceof SC.Config)) config=SC.Config.parse(config);
		var configFile=new SC.File(__dirname).changePath("../config/"+worker.name+".config");
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
					var key=param.data.key.split(/\]?\.|\[/);
					var oldValue=config.get(key);
					if(config.set(key,param.data.value))
					{
						return configFile.exists().then(()=>SC.util.rotateFile(configFile,3),()=>null)
						.then(()=>configFile.write(JSON.stringify(config.get())))
						.then(()=>({result:true}));
						setImmediate(notify,key,oldValue,param.data.value);
					}
					return {result:false};
					break;
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
