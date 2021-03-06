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
		appFeedback:function({context,method,data})
		{
			let requestApp=this;
			let targetApp;
			if(context=="NIWA")
			{
				switch (method) {
					case "appList":
						return backyard.list();
					case "appsConfig":
						return backyard.appsConfig;
					case "setAppConfig":
						return backyard.setAppConfig(data.token,data.context,data.config);
					case "addApp":
						return SC.backGardener.callModule("permissions","check",[data.token,["addApp"]])
						.then(function()
						{
							SC.backGardener.addApp(data.context,{path:data.path,autoStart:false});
							return backyard.setAppConfig(data.token,data.context,{path:data.path},true);
						});
					case "startApp":
						return SC.backGardener.startApp(data.token,data.context);
					case "stopApp":
						return SC.backGardener.stopApp(data.token,data.context);
					case "removeApp":
						return SC.backGardener.removeApp(data.token,data.context);
					case "module":
						return SC.backGardener.callModule(data.module,data.method,data.args);
					case "communicationList":
						return backyard.getCommunicationList(requestApp,data.name);
					default:
						return promise.reject("unknown method");
				}
			}

			return SC.backGardener.checkCommunication(requestApp.context,context)
			.then(function()
			{
				return apps.get(context).request(method,[data,requestApp.context]);
			});
		},
		setAppConfig:function(sessionToken,context,config,isAdd)
		{
			return SC.backGardener.callModule("permissions","check",[sessionToken,[isAdd?"addApp":"editApp"]])
			.then(()=>backyard.appsConfig)
			.then(function(appsConfig)
			{
				if(config===null)
				{
					delete appsConfig[context];
				}
				else
				{
					appsConfig[context]=config;

					if(!config.path&&apps.has(context))
					{
						config.path=apps.get(context).folder;
					}
				}
				return SC.util.enshureDir(new SC.File(SC.niwaWorkDir).changePath("config"))
				.then(function()
				{
					return this.changePath("apps.json")
					.write(JSON.stringify(appsConfig,null,"\t"));
				});
			});
		},
		getCommunicationList:async function async(app,name)
		{
			let rtn=[];
			for(let target of apps.values())
			{
				if(target==app) continue;
				if(target.niwaConfig.name==name)
				{
					try
					{
						await SC.backGardener.checkCommunication(app.context,target.context);
						rtn.push(target.context);
					}
					catch(e)
					{
						logger.info(e);
					}
				}
			}
			return rtn;
		}
	};

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);