
var SC=µ.shortcut({
	File:"File",
	fillResponse:require.bind(null,"./fillResponse"),
	proxy:"proxy",
	Promise:"Promise"
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
			appSources.push(filerDirectories(config.apps.map(normalizeApp)));
			appSources[appSources.length-1].then(apps=>logger.info("apps from config:\n%s",apps.map(app=>app.name+" : "+app.file.filePath).join("\n")));
		}
		if(config.appDir)
		{
			appSources.push(
				new SC.File(__dirname).changePath("..").changePath(config.appDir).listFiles().then(function(files)
				{
					return filerDirectories(files.map(f=>normalizeApp(this.clone().changePath(f))));
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
			for(app of apps) this.startApp(app.file.getAbsolutePath(),app.name);
		});
	},
	startApp:function(path,name)
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
			return true;
		}
		else
		{
			logger.warn(`app with name "${name}" is already running`);
			return false;
		}
	},
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
				app.eventSource(request,requestPath.slice(1).join("/").replace(/\?.*/,""),response);
			}
			else
			{//static resource
				SC.fillResponse(response,app.folder.clone().changePath(requestPath.join("/").replace(/\?.*/,"")));
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
var filerDirectories=function(files)
{
	return Promise.all(files.map(f=>f.file.stat().then(stat=>[stat.isDirectory(),f])))
	.then(files=>files.filter(f=>f[0]).map(f=>f[1]));
}
var gardenerFeedback=function(type,data)
{
	if(type=="NIWA")
	{
		switch (data) {
			case "applist":
				return Array.from(activeApps.values()).map(app=>({name:app.name,path:app.folder.filePath,state:app.getState(".readyState").value.state}));
				break;
			default:

		}
	}
	else return appFeedback.call(this,type,data);
}
var appFeedback=function(type,data)
{

}