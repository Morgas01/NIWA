var µ=require("Morgas");
var SC=µ.shortcut({
	File:"File",
	fillResponse:require.bind(null,"./fillResponse"),
	proxy:"proxy",
	Promise:"Promise",
	url:require.bind(null,"url"),
	less:require.bind(null,"less"),
	gui:require.bind(null,"MorgasGui")
});

var LOG=require("../logger");
var logger=LOG("main");
var config=require("../config");
var NIWAapp=require("./NIWAapp");
var activeApps=new Map();

var backGarden=module.exports={
	initApps:function()
	{
		logger.info("initializing apps...")
		var appSources=[];
		if(config.apps)
		{
			appSources.push(filterDirectories(config.apps.map(normalizeApp)));
			appSources[appSources.length-1].then(apps=>logger.info("apps from config:\n%s",apps.map(app=>app.name+" : "+app.file.filePath).join("\n")));
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
			appSources[appSources.length-1].then(apps=>logger.info("apps scanned:\n%s",apps.map(app=>app.name+" : "+app.file.filePath).join("\n")));
		}
		new SC.Promise(appSources)
		.then(Array.prototype.concat.bind(Array.prototype))
		.then(apps=>
		{
			return Promise.all(apps.map(app=>this.startApp(app.name,app.file.getAbsolutePath())));
		})
		.then(results=>
		{
			logger.info({results:results},"apps started ["+results.filter(r=>r.appState.id!==undefined).map(r=>r.name)+"]")
			//populate apps
			for(var result of results)
			{
				var nameDictionary={};
				ids:for(var id of [].concat(result.appState.dependencies||[],result.appState.uses||[]))
				{
					var names=nameDictionary[id]=[];
					for(var app of activeApps.values())
					{
						if(app.appId==id) names.push(app.name);
					}
				}
				activeApps.get(result.name).send("appsStarted",nameDictionary);
			}
		})
		.catch(e=>logger.error({error:e},"error starting apps"));
	},
	startApp:SC.Promise.pledge(function(signal,name,path)
	{
		if(!activeApps.has(name))
		{
			logger.info(`starting app ${name} : ${path}`);
			var app=new NIWAapp(name,path);
			activeApps.set(name,app);
			if(name=="gardener")
			{
				app.onFeedback=gardenerFeedback;
			}
			else
			{
				app.onFeedback=appFeedback;
			}
		}
		else
		{
			logger.warn(`app with name "${name}" is already running`);
		}
		activeApps.get(name).ready().always(state=>signal.resolve({name:name,appState:state}));
	}),
	handleRequest:function(appName,request,response,requestPath)
	{
		if(activeApps.has(appName))
		{
			var app=activeApps.get(appName);
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
				var cssIndex=requestPath.indexOf("css");
				if(cssIndex!=-1&&requestPath[requestPath.length-1].match(/\.less$/))
				{//compile less file
					requestPath[cssIndex]="less";
					app.less(requestPath.join("/"),SC.url.parse(request.url,true).query)
					.then(result=>SC.fillResponse(response,result,{"Content-Type":SC.fillResponse.getMimeType(".css")}),
					error=>SC.fillResponse(response,error.error,error.headers,error.status||400));
				}
				else SC.fillResponse(response,app.folder.clone().changePath(requestPath.join("/")));
			}
			return true;
		}
		return false;
	}
};
SC.proxy(activeApps,["has","get"],backGarden);
/**
 * @param {String|String[]|µ.File} app
 * @param {Object} {file,name}
 */
var normalizeApp=function(app)
{
	var rtn={file:null,name:null};
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
var filterDirectories=function(files)
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
var gardenerFeedback=function(requestAppName,data)
{
	if(requestAppName=="NIWA")
	{
		switch (data) {
			case "applist":
				return Array.from(activeApps.values()).map(app=>{
					var appState=app.getAppState();
					return {
						name:app.name,
						path:app.folder.filePath,
						state:appState.state,
						id:(appState.data||{}).id,
						dependencies:(appState.data||{}).dependencies
					}
				});
				break;
			default:

		}
	}
	else return appFeedback.call(this,requestAppName,data);
}
var appFeedback=function(requestAppName,data)
{
	var appState=this.getAppState()
	var targetApp=activeApps.get(requestAppName);
	var allowed=[].concat(appState.data.dependencies,appState.data.uses);
	if(!targetApp)
	{
		var message=String.raw`no app for ${requestAppName}`;
		this.logger.warn(message);
		return Promise.reject(message);
	}
	else if(allowed.indexOf(targetApp.id)==-1)
	{
		var message=String.raw`access was not Specified for ${requestAppName} from ${appState.data.id}(${this.name}).\nSee package.json [niwaDependencies or niwaUses]`;
		this.logger.warn(message);
		return Promise.reject(message);
	}
	else
	{
		return targetApp.request(data.method,[data.data,this.name]);
	}
}
