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
					µ.logger.warn({error:other.error,file:other.file},"error loading config");
				}
				µ.logger.warn("load file "+result.file+" instead")
			}
			config.setAll(result.data,true)
		}, errors=>µ.logger.warn({errors:errors},"could not load config"));

		return function(param)
		{
			switch(param.method)
			{
				default:
				case "GET":
					return config.toJSON();
					break;
				case "POST":
					var key=param.data.key.split(/\]?\.|\[/);
					if(config.set(param.data.key,param.data.value))
					{
						//TODO save & notify
						return configFile.exists().then(()=>SC.util.rotateFile(configFile,3),()=>null)
						.then(()=>configFile.write(JSON.stringify(config.get())))
						.then(()=>({result:true}));
					}
					return {result:false};
					break;
				case "OPTIONS":
					return {
						description:config.toDescription(),
						value:config.toJSON()
					};
			}
		}
	};

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
