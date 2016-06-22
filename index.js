var µ=require("Morgas");

var http=require("http");

var SC=µ.shortcut({
	File:"File",
	fileUtils:"File.util",
	adopt:"adopt",
	fillResponse:require.bind(null,"./lib/fillResponse")
});
var NIWAapp=require("./NIWAapp");

//var config=require("./config");
var config={
	port:8081,
	//apps:["../NIWA-storage"]
	apps:["../NIWA-Storage","../Morgas.js"]
};
var LOG=require("./logger");
var logger=LOG.setCoreLogger(LOG("main"));

var activeApps=new Map();

logger.info(`starting server with port ${config.port}`);
var server=http.createServer(function(request,response)
{
	logger.info({url:request.url},"access");
	if(request.url==="/")
	{//redirect
	}
	else
	{
		var requestPath=request.url.slice(1).split("/");
		if(requestPath.length==1||requestPath[1]=="")
		{
			var newUrl="http://"+request.headers['host']+"/"+requestPath[0]+"/index.html";
			logger.info(`redirect ${request.url} to ${newUrl}`);
			SC.fillResponse(response,http.STATUS_CODES[302]+ '. Redirecting to ' + requestPath[0]+"/index.html",{
				'Location': newUrl
			},302);
		}
		else if(requestPath[0]=="morgas")
		{
			SC.fillResponse(response,new SC.File(µ.dirname).changePath(requestPath.slice(1).join("/")));
		}
		else if(activeApps.has(requestPath[0]))
		{//app
			var app=activeApps.get(requestPath[0]);
			if(requestPath.length==1) requestPath.push("index.html");
			if(requestPath[1]=="rest")
			{//restService
				app.rest(request,requestPath.slice(2))
				.then(result=>SC.fillResponse(response,result.data,result.headers,result.status),
				error=>SC.fillResponse(response,error.error,error.headers,error.status||400));
			}
			else if(requestPath[1]=="event")
			{//event source
				app.eventSource(request,requestPath.slice(2).join("/").replace(/\?.*/,""),response);
			}
			else
			{//static resource
				SC.fillResponse(response,app.folder.clone().changePath(requestPath.slice(1).join("/").replace(/\?.*/,"")));
			}
		}
		else
		{//unknown app
			SC.fillResponse(response,`no such app "${requestPath[0]}"`,null,501)
		}
	}
});
server.listen(config.port,function(e)
{
	if(e){
		logger.error({error:e},"failed to start server");
	}
	else
	{
		logger.info("server startet");
		
		for(app of config.apps)
		{
			var path,name;
			if(typeof app=="string")
			{
				path=app;
				name=new SC.File(path).getName();
			}
			else // array
			{
				path=app[0];
				name=app[1];
			}
			if(!activeApps.has(name))
			{
				logger.info(`starting app ${path} as ${name}`);
				activeApps.set(name,new NIWAapp(name,path));
			}
			else
			{
				logger.warn(`app with name "${name}" is already running`);
			}
		}
	}
});
