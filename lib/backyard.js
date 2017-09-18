(function(µ,SMOD,GMOD,HMOD,SC){

	let SC=µ.shortcut({
		File:"File",
		fillResponse:require.bind(null,"./fillResponse"),
		mimeType:require.bind(null,"../util/mimeType"),
		proxy:"proxy",
		Promise:"Promise",
		url:require.bind(null,"url"),
		less:require.bind(null,"less"),
		gui:require.bind(null,"MorgasGui"),
		flatten:"flatten"
	});

	let LOG=require("../logger");
	let logger=LOG("main");
	let config=require("../config");
	let NIWAapp=require("./NIWAapp");
	let activeApps=new Map();

	let backyard=module.exports={
		initialized:Promise.reject("not initialized"),
		initApps:function()
		{
			logger.info("initializing apps...")
			let appSources=[];
			if(config.apps)
			{
				appSources.push(filterDirectories(config.apps.map(normalizeApp)));
				appSources[appSources.length-1].then(apps=>logger.info("apps from config:\n%s",apps.map(app=>app.context+" : "+app.file.filePath).join("\n")));
			}
			if(config.appDir)
			{
				appSources.push(
					new SC.File(__dirname).changePath("..").changePath(config.appDir).listFiles().then(function(files)
					{
						return filterDirectories(files.map(f=>normalizeApp(this.clone().changePath(f))));
					},
					function(e)
					{
						logger.error({appDir:this.getAbsolutePath(),error:e},"could not load apps from appDir");
						return [];
					})
				);
				appSources[appSources.length-1].then(apps=>logger.info("apps scanned:\n%s",apps.map(app=>app.context+" : "+app.file.filePath).join("\n")));
			}
			return backyard.initialized=Promise.all(appSources)
			.then(SC.flatten)
			.then(apps=>
			{
				return Promise.all(apps.map(app=>this.startApp(app.context,app.file.getAbsolutePath())))
				.then(results=>results.filter(r=>!r.error));//filter not started
			})
			.then(results=>
			{
				logger.info({results:results},"apps started ["+results.map(r=>r.context).join(", ")+"]")
			})
			.catch(e=>
			{
				logger.error({error:e},"error starting apps");
			});
		},
		startApp:SC.Promise.pledge(function(signal,context,path)
		{
			logger.info(`starting app ${context} : ${path}`);
			if(!activeApps.has(context))
			{
				let app=new NIWAapp(context,path);
				activeApps.set(context,app);
				if(name=="gardener") // privileged app
				{
					app.onFeedback=gardenerFeedback;
				}
				else
				{
					app.onFeedback=appFeedback;
				}
				return app.ready().then(result=>
				{
					backyard.initialized.then(()=>app.send("serverStarted"));
					return {result:result};
				}),error=>({error:error}));
			}
			return Promise.reject("context occupied");
		}),
		populateAppStart:function(app)
		{
			let knownApps=[];
			if(app.niwaConfig.dependencies) knownApps.push(...app.niwaConfig.dependencies);
			if(app.niwaConfig.uses) knownApps.push(...app.niwaConfig.uses);
			for(let appName of knownApps)
			{

			}
		},
		handleRequest:function(appName,request,response,requestPath)
		{
			if(activeApps.has(appName))
			{
				let app=activeApps.get(appName);
				if(requestPath.length==0) requestPath.push("index.html");
				if(requestPath[0]=="rest")
				{//restService
					app.rest(request,requestPath.slice(1))
					.then(result=>SC.fillResponse(response,result.data,result.headers,result.status),
					error=>SC.fillResponse(response,error.error,error.headers,error.status||400));
				}
				else if(requestPath[0]=="event")
				{//event source
					app.eventSource(request,requestPath.slice(1).join("/"),response);
				}
				else
				{//resource
					let cssIndex=requestPath.indexOf("css");
					if(cssIndex!=-1&&requestPath[requestPath.length-1].match(/\.less$/))
					{//compile less file
						requestPath[cssIndex]="less";
						app.less(requestPath.join("/"),SC.url.parse(request.url,true).query)
						.then(result=>SC.fillResponse(response,result,{"Content-Type":SC.mimeType.get(".css")}),
						error=>SC.fillResponse(response,error.error,error.headers,error.status||400));
					}
					else SC.fillResponse(response,app.folder.clone().changePath(requestPath.join("/")));
				}
				return true;
			}
			return false;
		}
	};
	SC.proxy(activeApps,["has","get"],backyard);
	/**
	 * @param {String|String[]|µ.File} app
	 * @param {Object} {file,name}
	 */
	let normalizeApp=function(app)
	{
		let rtn={file:null,name:null};
		if(app instanceof Array)
		{
			rtn.file=new SC.File(app[0]);
			rtn.name=app[1]
		}
		else // µ.file
		{
			rtn.file=SC.File.stringToFile(app);
			rtn.name=rtn.file.getName();
		}
		return rtn;
	};
	let filterDirectories=function(files)
	{
		return Promise.all(
			files.map(f=>
				f.file.stat()
				.then(stat=>[stat.isDirectory(),f]
				,e=>
				{
					logger.error({error:e,app:f},"no such folder");
					return [false];
				})
			)
		)
		.then(files=>files.filter(f=>f[0]).map(f=>f[1]));
	}
	let appFeedback=function(requestAppName,data)
	{
		let appState=this.getAppState()
		let targetApp=activeApps.get(requestAppName);
		let allowed=[].concat(appState.data.dependencies,appState.data.uses);
		if(!targetApp)
		{
			let message=String.raw`no app for ${requestAppName}`;
			this.logger.warn(message);
			return Promise.reject(message);
		}
		else if(allowed.indexOf(targetApp.id)==-1)
		{
			let message=String.raw`access was not Specified for ${requestAppName} from ${appState.data.id}(${this.name}).\nSee package.json [niwaDependencies or niwaUses]`;
			this.logger.warn(message);
			return Promise.reject(message);
		}
		else
		{
			return targetApp.request(data.method,[data.data,this.name]);
		}
	}

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);