/** handles apps life cycle, sessions and system information */
(function(µ,SMOD,GMOD,HMOD,SC){

	SC=µ.shortcut({
		Promise:"Promise",
		File:"File",
		fillResponse:require.bind(null,"./fillResponse"),
		mimeType:require.bind(null,"../util/mimeType"),
		url:require.bind(null,"url"),
		backyard:require.bind(null,"./backyard"),
		ServiceResult:require.bind(null,"../util/ServiceResult"),
		niwaWorkDir:"niwaWorkDir",
		remove:"array.remove",
		AbstractWorker:"AbstractWorker"
	});

	let logger=require("./logger")("main").child({component:"backgardener"});
	let config=require("./config");
	let NIWAapp=require("./NIWAapp");

	let backGardener=module.exports={
		initialized:Promise.reject("not initialized"),
		initApps:function()
		{
			logger.info({lnr:"001"},"initializing apps...")
			return backGardener.initialized=new SC.Promise([
				new SC.File(SC.niwaWorkDir)
				.changePath("apps")
				.listFiles()
				.then(filterDirectories),
				SC.backyard.appsConfig
			])
			.then(function(scanned,appsConfig)
			{
				let promises=[];
				for(let context in appsConfig)
				{
					let app=backGardener.addApp(context,appsConfig[context]);
					promises.push(app.ready
						.catch(function(error)
						{
							logger.error({lnr:"002",error:error},`could not start app ${context} : ${appsConfig[context].path}`);
						})
					);
					SC.remove(scanned,appsConfig[context].path);
				}

				for(let context of scanned)
				{
					try {
						let app=backGardener.addApp(context,{path:context})
						promises.push(app.ready
							.catch(function(error)
							{
								logger.error({lnr:"003",error:error},`could not start app ${context} : ${context}`);
							})
						);
					}
					catch (e)
					{
						logger.error({lnr:"004",error:error},`could not start app ${context} : ${context}`);
					}
				}

				return Promise.all(promises);
			})
			.then(function()
			{
				let appList=SC.backyard.list();
				logger.info({lnr:"005",apps:appList},"apps started: ["+appList
				.filter(a=>a.state===SC.AbstractWorker.states.OPEN).map(a=>a.context).join(", ")+"]");
			})
			.catch(e=>
			{
				logger.error({lnr:"006",error:e},"error starting apps");
			})
			.then(function()
			{
				// overwrite to prevent further calls
				backGardener.initApps=()=>backGardener.initialized;;
			});
		},
		addApp:function(context,{path,autoStart=config.autoStart,logLevel=config.logLevel})
		{
			logger.info({lnr:"007"},`adding app ${context} : ${path}`);
			if(!SC.backyard.has(context))
			{
				let app=new NIWAapp({
					context:context,
					path:path,
					autoStart:autoStart,
					logLevel:logLevel,
					serverPromise:backGardener.initialized
				});

				if(SC.backyard.add(app))
				{
					return app;
				}
				else
				{
					app.destroy();
				}
			}
			throw new Error("context occupied");
		},
		handleRequest:function(context,request,response,requestPath)
		{
			let app=SC.backyard.get(context);
			if(app!=null&&app.state===SC.AbstractWorker.states.OPEN)
			{
				if(requestPath.length==0) requestPath.push("index.html");
				if(requestPath[0]=="rest")
				{//restService
					app.rest(request,requestPath.slice(1))
					.then(result=>SC.fillResponse(response,result.data,result.headers,result.status),
					function(error)
					{
						logger.error({lnr:"008",error:error},`error while calling rest service of /${context}`);
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
					else SC.fillResponse(response,new SC.File(app.cwd).changePath(requestPath.join("/")));
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
				logger.error({lnr:"009",error:e},"error loading module");
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
				logger.error({lnr:"010",error:e},`error calling method ${method} of module ${moduleName}`);
				return Promise.reject(SC.ServiceResult.wrapError(e));
			}
		}
	};
	let filterDirectories=function(files)
	{
		return Promise.all(
			files.map(f=>
				this.clone().changePath(f).stat()
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