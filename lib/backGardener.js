(function(µ,SMOD,GMOD,HMOD,SC){

	SC=SC({
		backyard:require.bind(null,"./backyard")
	});

	let backGardener=module.exports={
		gardenerFeedback:function(param)
		{
			let {name,method,data}=param;

			if(name=="NIWA")
			{
				switch (method) {
					case "applist":
						return Array.from(activeApps.values()).map(app=>{
							let niwaConfig=app.niwaConfig||{};
							return {
								context:app.context,
								path:app.folder.filePath,
								state:appState.state,
								name:niwaConfig.name,
								dependencies:niwaConfig.dependencies
								uses:niwaConfig.uses
							}
						});
						break;
					default:

				}
			}
			else return appFeedback.call(this,param);
		},
		appFeedback:function({name,method,data})
		{
			let requestApp=this;
			let targetApp;
			// TODO check config
			for(let app of activeApps.values().get(name))
			{
				if(app.niwaConfig.name==name)
				{
					targetApp=app;
					break;
				}
			}
			if(targetApp.dependencies.includes(requestApp.niwaConfig.name)||targetApp.uses.includes(requestApp.niwaConfig.name))
			{
				return targetApp.request(method,[data]);
			}
			return Promise.reject();
		}
	};

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);