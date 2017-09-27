/** holds all apps and and lets them communicate */
(function(µ,SMOD,GMOD,HMOD,SC){

	SC=SC({
		backGardener:require.bind(null,"./backGardener")
	});

	let apps=new Map();// Map<context,app>
	let backyard=module.exports={
		add:function(app)
		{
			if(!apps.has(app.context))
			{
				apps.set(app.context,app);
				app.onFeedback=backyard.appFeedback;
				return true;
			}
			return false;
		},
		get:apps.get.bind(apps),
		has:apps.has.bind(apps),
		remove:apps.delete.bind(apps),
		list:function()
		{
			return Array.from(apps.values()).map(app=>
			{
				let niwaConfig=app.niwaConfig||{};
				return {
					context:app.context,
					path:app.folder.filePath,
					state:appState.state,
					name:niwaConfig.name,
					dependencies:niwaConfig.dependencies,
					uses:niwaConfig.uses
				}
			});
		},
		appFeedback:function({name,method,data})
		{
			let requestApp=this;
			let targetApp;
			if(name=="NIWA")
			{
				// TODO check permission
				switch (method) {
					case "applist":
						return backyard.list();
						break;
					case "module":
						return SC.backGardener.callModule(data.module,data.method,data.args);
						break;
					default:
						return promise.reject("unknown method");
				}
			}
			// TODO check config
			for(let app of apps.values().get(name))
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