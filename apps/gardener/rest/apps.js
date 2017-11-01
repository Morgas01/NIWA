(function(µ,SMOD,GMOD,HMOD,SC){

	SC=SC({
		Promise:"Promise",
		ServiceResult:"ServiceResult",
		remove:"array.remove"
	})

	module.exports={
		list:function()
		{
			return new SC.Promise([
				worker.ask("NIWA","appList"),
				worker.ask("NIWA","appsConfig")
			])
			.then(function(list,config)
			{
				for(let app of list)
				{
					if(app.context in config)
					{
						({
							autoStart:app.autoStart,
							logLevel:app.logLevel,
							communication:app.communication
						}=config[app.context]);
					}
				}

				return list;
			});
		},
		config:function(param)
		{
			context=param.path[0];
			if(!context) return new SC.ServiceResult({status:400,data:"missing path param (context)"});
			return worker.ask("NIWA","appsConfig")
			.then(function(appsConfig)
			{
				let config=appsConfig[context]||{};

				if(param.data.autoStart==null) delete config.autoStart;
				else config.autoStart=!!param.data.autoStart;
				if(param.data.logLevel==null) delete config.logLevel;
				else config.logLevel=param.data.logLevel;
				if(param.data.communication==null) delete config.communication;
				else if (typeof param.data.communication==="boolean")
				{
					config.communication=param.data.communication;
				}
				else
				{
					let commContexts;
					if(typeof config.communication==="object")
					{
						commContexts=Object.keys(config.communication);
					}
					else
					{
						commContexts=[];
						config.communication={};
					}

					for(let key in param.data.communication)
					{
						SC.remove(commContexts,key);
						let commData=param.data.communication[key];

						if(commData==null) delete config.communication[key];
						config.communication[key]=commData;
					}

					for(let key of commContexts)
					{
						delete config.communication[key];
					}
				}

				return worker.ask("NIWA","setAppConfig",[context,config]);
			});
		}
	};

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
