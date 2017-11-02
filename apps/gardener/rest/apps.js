(function(µ,SMOD,GMOD,HMOD,SC){

	SC=SC({
		Promise:"Promise",
		ServiceResult:"ServiceResult",
		remove:"array.remove",
		File:"File",
		niwaWorkDir:"niwaWorkDir"
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

				return worker.ask("NIWA","setAppConfig",{context:context,config:config});
			});
		},
		add:function(param)
		{
			return new SC.File(SC.niwaWorkDir).changePath("apps").changePath(param.data.path).exists()
			.then(function()
			{
				return worker.ask("NIWA","addApp",{context:param.data.context,path:param.data.path});
			},function()
			{
				return Promise.reject(new SC.ServiceResult({data:"folder "+this.getAbsolutePath()+" does not exist",status:400}));
			});
		},
		start:function(param)
		{
			return worker.ask("NIWA","startApp",param.data.context)
		},
		stop:function(param)
		{
			return worker.ask("NIWA","stopApp",param.data.context)
		},
		remove:function(param)
		{
			return worker.ask("NIWA","removeApp",param.data.context)
		}
	};

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
