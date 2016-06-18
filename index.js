var µ=require("Morgas");

var http=require("http");

var SC=µ.shortcut({
	File:"File",
	fileUtils:"File.util",
	adopt:"adopt"
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
			fillResponse(response,http.STATUS_CODES[302]+ '. Redirecting to ' + requestPath[0]+"/index.html",{
				'Location': newUrl
			},302);
		}
		else if(requestPath[0]=="morgas")
		{
			fillResponse(response,new SC.File(µ.dirname).changePath(requestPath.slice(1).join("/")));
		}
		else if(activeApps.has(requestPath[0]))
		{//app
			var app=activeApps.get(requestPath[0]);
			if(requestPath.length==1) requestPath.push("index.html");
			if(requestPath[1]!="rest")
			{//static resource
				fillResponse(response,app.folder.clone().changePath(requestPath.slice(1).join("/").replace(/\?.*/,"")));
			}
			else
			{//restService
				app.rest(request,requestPath.slice(2))
				.then(result=>fillResponse(response,result.data,result.headers,result.status),
				error=>fillResponse(response,error.data,error.headers,error.status||400));
			}
		}
		else
		{//unknown app
			fillResponse(response,`no such app "${requestPath[0]}"`,null,501)
		}
	}
});
var fillResponse=function(response,data,headers,status)
{
	if(data instanceof SC.File)
	{
		data.stat().then(stat=>
		{
			if(stat.isFile())
			{
				response.writeHead(status||200,{
					"Content-Type":getMimeType(data),
					"Content-Length":stat.size
				});
				return data.readStream()
				.then(stream=>stream.pipe(response));
			}
			else
			{
				return Promise.reject(data.filePath+" is not a file");
			}
		})
		.catch(function(e)
		{//error
			fillResponse(response,e,null,404);
		});
	}
	else if(data instanceof Error) fillResponse(response,data.message+"\n\n"+data.stack,null,status||500);
	else if (data instanceof Object) fillResponse(response,JSON.stringify(data),{"Content-Type":"application/json"});
	else
	{
		if(data==undefined)data="";
		else data+="";
		response.writeHead(status||200, SC.adopt.setDefaults({
			"Content-Type":"text/plain",
			"Content-Length":Buffer.byteLength(data, 'utf8')
		},headers,true));
		response.end(data);
	}
};
var getMimeType=function(file)
{
	switch(file.getExt())
	{
		case ".html":	return "text/html";
		case ".css":	return "text/css";
		case ".js":		return "application/javascript";
		case ".svg":	return "image/svg+xml";
		default : 		return "application/octet-stream";
	}
}
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
