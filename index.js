var µ=require("Morgas");

var http=require("http");

var SC=µ.shortcut({
	File:"File",
	fileUtils:"File.util",
	adopt:"adopt",
	fillResponse:require.bind(null,"./lib/fillResponse"),
	gui:require.bind(null,"MorgasGui")
});

var LOG=require("./logger");
var logger=LOG.setCoreLogger(LOG("main"));
var accessLogger=LOG("access");
var config=require("./config");
var backGarden=require("./lib/backGarden");

var handleRequest=function(request,response)
{
	accessLogger.info({url:request.url});
	if(request.url==="/")
	{//redirect
		//TODO
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
		{// morgas sources
			handleMorgasSources(request,response,requestPath);
		}
		else if(backGarden.has(requestPath[0]))
		{//app
			backGarden.handleRequest(requestPath[0],request,response,requestPath.slice(1));
		}
		else
		{//unknown app
			SC.fillResponse(response,`no such app "${requestPath[0]}"`,null,501)
		}
	}
};
var getStyle=function(path)
{
	path=path.split("?");
	path=push("default");
	return new SC.Promise([
		new SC.File(µ.gui.dirname).changePath("less/theme/"+path[1]).read(),
		new SC.File(µ.gui.dirname).changePath("less/structure/"+path[0]).read(),
		new SC.File(µ.gui.dirname).changePath("less/style/"+path[0]).read(),
	]).then(function(theme,structure,style)
	{
		return SC.less.render(theme+"\n"+structure+"\n"+style);
	});
}
var handleMorgasSources=function(request,response,requestPath)
{
	if(requestPath[1]=="gui")
	{
		if(requestPath[2]=="css")
		{
			if(requestPath[3]=="theme")
			{
				//TODO pass theme components
				SC.fillResponse(response,SC.gui.getTheme(requestPath.slice(4).join("/")),{"Content-Type":SC.fillResponse.getMimeType(".css")});
			}
			else
			{
				//TODO pass component's theme
				SC.fillResponse(response,SC.gui.getComponentStyle(requestPath.slice(3).join("/")),{"Content-Type":SC.fillResponse.getMimeType(".css")});
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
var server=http.createServer(handleRequest);
server.listen(config.port,function(e)
{
	if(e){
		logger.error({error:e},"failed to start server");
	}
	else
	{
		logger.info("server startet");

		backGarden.initApps();
	}
});
