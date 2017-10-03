/** handles apps life cycle, sessions and system information */
(function(µ,SMOD,GMOD,HMOD,SC){

	SC=µ.shortcut({
		File:"File",
		fillResponse:require.bind(null,"./fillResponse"),
		mimeType:require.bind(null,"../util/mimeType"),
		url:require.bind(null,"url"),
		flatten:"flatten",
		backyard:require.bind(null,"./backyard"),
		ServiceResult:require.bind(null,"../util/ServiceResult")
	});

	let LOG=require("../logger");
	let logger=LOG("main");
	let config=require("../config");
	let NIWAapp=require("./NIWAapp");

	let backGardener=module.exports={
		activeApps:new Map(),
		initialized:Promise.reject("not initialized"),
		initApps:function()
		{
			logger.info({component:"#backGarnerder:001"},"#initializing apps...")
			let appSources=[];
			if(config.apps)
			{
				appSources.push(filterDirectories(config.apps.map(normalizeApp)));
				appSources[appSources.length-1].then(apps=>logger.info({component:"#backGarnerder:002"},"apps from config:\n%s",apps.map(app=>app.context+" : "+app.file.filePath).join("\n")));
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
						logger.error({appDir:this.getAbsolutePath(),error:e,component:"#backGarnerder:003"},"could not load apps from appDir");
						return [];
					})
				);
				appSources[appSources.length-1].then(apps=>logger.info({component:"#backGarnerder:004"},"apps scanned:\n%s",apps.map(app=>app.context+" : "+app.file.filePath).join("\n")));
			}
			backGardener.initialized=Promise.all(appSources)
			.then(SC.flatten)
			.then(apps=>
			{
				return Promise.all(apps.map(app=>
					this.startApp(app.context,app.file.getAbsolutePath())
					.then(e=>({error:e}))
				))
				.then(results=>results.filter(r=>!r.error));//filter not started
			})
			.then(results=>
			{
				logger.info({component:"#backGarnerder:005",results:results},"apps started ["+results.map(r=>r.context).join(", ")+"]")
			})
			.catch(e=>
			{
				logger.error({component:"#backGarnerder:006",error:e},"error starting apps");
			});
			// overwrite to prevent further calls
			backGardener.initApps=()=>backGardener.initialized;

			return backGardener.initialized;
		},
		startApp:function(context,path)
		{
			logger.info({component:"#backGarnerder:007"},`starting app ${context} : ${path}`);
			if(!SC.backyard.has(context))
			{
				let app=new NIWAapp(context,path);
				SC.backyard.add(app);
				return app.ready.then(result=>
				{
					backGardener.initialized.then(()=>app.send("serverStarted"));
					return {result:result};
				},error=>({error:error}));
			}
			return Promise.reject("context occupied");
		},
		handleRequest:function(context,request,response,requestPath)
		{
			if(SC.backyard.has(context))
			{
				let app=SC.backyard.get(context);
				if(requestPath.length==0) requestPath.push("index.html");
				if(requestPath[0]=="rest")
				{//restService
					app.rest(request,requestPath.slice(1))
					.then(result=>SC.fillResponse(response,result.data,result.headers,result.status),
					function(error)
					{
						µ.logger.error({component:"#backGarnerder:008",error:error},`error while calling rest service of /${context}`);
						SC.fillResponse(response,error,null,500)
					});
				}
				else if(requestPath[0]=="event")
				{//event source
					app.eventSource(request,requestPath.slice(1).join("/"),response);
				}
				else
				{//resource
					let cssIndex=requestPath.indexOf("css");
					if(cssIndex!=-1&&requestPath[requestPath.length-1].endsWith(".less")) // request url contains "/css/" and ends with .less
					{//compile less file
						requestPath[cssIndex]="less"; // correct url to real path
						app.less(requestPath.join("/"),SC.url.parse(request.url,true).query)
						.then(result=>SC.fillResponse(response,result,{"Content-Type":SC.mimeType.get(".css")}),
						error=>SC.fillResponse(response,error.error,error.headers,error.status||400));
					}
					else SC.fillResponse(response,app.folder.clone().changePath(requestPath.join("/")));
				}
				return true;
			}
			return false;
		},
		callModule:function(moduleName,method,args=[])
		{
			let module=null;
			try
			{
				module=require("../modules/"+moduleName);
			}
			catch(e)
			{
				logger.error({component:"#backGarnerder:009",error:e},"error loading module");
				return Promise.reject(new SC.ServiceResult({data:"error loading module",status:500}));
			}

			if(!(method in module))
			{
				return Promise.reject(new SC.ServiceResult({data:`no method ${method} in module ${moduleName}`,status:400}));
			}
			try
			{
				return module[method](...args);
			}
			catch(e)
			{
				logger.error({component:"#backGarnerder:010",error:e},`error calling method ${method} of module ${moduleName}`);
				return Promise.reject(SC.ServiceResult.wrapError(e));
			}
		}
	};
	/**
	 * @param {String|String[]|µ.File} app
	 */
	let normalizeApp=function(app)
	{
		let rtn={file:null,context:null};
		if(app instanceof Array)
		{
			rtn.file=new SC.File(app[0]);
			rtn.context=app[1]
		}
		else // µ.file
		{
			rtn.file=SC.File.stringToFile(app);
			rtn.context=rtn.file.getName();
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
	};

	//@suppress UnhandledPromiseRejectionWarning
	backGardener.initialized.catch(µ.constantFunctions.n);

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);