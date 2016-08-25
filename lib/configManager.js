var µ=require("Morgas");
var gui=require("MorgasGui");
(function(µ,SMOD,GMOD,HMOD,SC){

	var SC=µ.shortcut({
		File:"File",
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
		try
		{
			config.setAll(require("../config/"+worker.name+".config"),true);
		}
		catch (e)
		{
			µ.logger.warn({error:e},"could not load config");
		}
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
					settings.set(param.key,param.data.value);
					//TODO save & notify
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
