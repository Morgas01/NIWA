/** holds all apps and and lets them communicate */
(function(µ,SMOD,GMOD,HMOD,SC){

	SC=SC({
		backGardener:require.bind(null,"./backGardener"),
		File:"File",
		util:"File.util",
		niwaWorkDir:"niwaWorkDir"
	});


	let logger=require("./logger")("main").child({component:"backyard"});

	let apps=new Map();// Map<context,app>
	let backyard=module.exports={
		appsConfig:new SC.File(SC.niwaWorkDir)
			.changePath("config/apps.json")
			.exists()
			.then(function()
			{
				return this.read()
				.then(JSON.parse)
				.catch(function()
				{
					let message=`failed to parse apps.json (${this.getAbsolutePath()})`
					logger.error({lnr:001},message);
					throw new Error(message);
				});
			},
			()=>({}) // ignore not existing apps.json
		),
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
					path:app.folder,
					state:app.state,
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
					case "appList":
						return backyard.list();
						break;
					case "appsConfig":
						return backyard.appsConfig;
						break;
					case "setAppConfig":
						return backyard.setAppConfig(data[0],data[1]);
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
		},
		setAppConfig:function(context,config)
		{
			return backyard.appsConfig.then(function(appsConfig)
			{
				appsConfig[context]=config;
				if(!config.path&&apps.has(context))
				{
					config.path=apps.get(context).folder;
				}
				return SC.util.enshureDir(new SC.File(SC.niwaWorkDir).changePath("config"))
				.then(function()
				{
					return this.changePath("apps.json")
					.write(JSON.stringify(appsConfig,null,"\t"));
				});
			});
		}
	};

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);