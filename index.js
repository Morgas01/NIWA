let µ=require("Morgas");

let http=require("http");
let URL=require("url");

let SC=µ.shortcut({
	File:"File",
	fileUtils:"File.util",
	adopt:"adopt",
	fillResponse:require.bind(null,"./lib/fillResponse"),
	mimeType:require.bind(null,"./util/mimeType"),
	gui:require.bind(null,"MorgasGui")
});

let LOG=require("./logger");
let logger=LOG.setCoreLogger(LOG("main"));
let accessLogger=LOG("access");
let config=require("./config");
let backyard=require("./lib/backyard");

let handleRequest=function(request,response)
{
	accessLogger.info({url:request.url});
	if(request.url==="/")
	{//redirect
		//TODO config
	}
	else
	{
		let requestPath=URL.parse(request.url.slice(1)).pathname.split("/");
		if(requestPath.length==1||requestPath[1]=="")
		{
			let newUrl="http://"+request.headers['host']+"/"+requestPath[0]+"/index.html";
			logger.info(`redirect ${request.url} to ${newUrl}`);
			SC.fillResponse(response,http.STATUS_CODES[302]+ '. Redirecting to ' + requestPath[0]+"/index.html",{
				'Location': newUrl
			},302);
		}
		else if(requestPath[0]=="morgas")
		{// morgas sources
			handleMorgasSources(request,response,requestPath);
		}
		else if(backyard.has(requestPath[0]))
		{//app
			backyard.handleRequest(requestPath[0],request,response,requestPath.slice(1));
		}
		else
		{//unknown app
			SC.fillResponse(response,`no such app "${requestPath[0]}"`,null,501)
		}
	}
};
let handleMorgasSources=function(request,response,requestPath)
{
	if(requestPath[1]=="gui")
	{
		if(requestPath[2]=="css")
		{
			if(requestPath[3]=="theme")
			{
				//TODO pass theme components
				SC.fillResponse(response,SC.gui.getTheme(requestPath.slice(4).join("/")),{"Content-Type":SC.mimeType.get(".css")});
			}
			else
			{
				//TODO pass component's theme
				SC.fillResponse(response,SC.gui.getComponentStyle(requestPath.slice(3).join("/")),{"Content-Type":SC.mimeType.get(".css")});
			}
		}
		else
		{
			SC.fillResponse(response,new SC.File(SC.gui.dirname).changePath(requestPath.slice(2).join("/")));
		}
	}
	else SC.fillResponse(response,new SC.File(µ.dirname).changePath(requestPath.slice(1).join("/")));
}

logger.info(`starting server with port ${config.port}`);
let server=http.createServer(handleRequest);
server.listen(config.port,function(e)
{
	if(e){
		logger.error({error:e},"failed to start server");
	}
	else
	{
		logger.info("server startet");

		backyard.initApps();
	}
});
