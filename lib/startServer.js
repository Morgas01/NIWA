(function(µ,SMOD,GMOD,HMOD,SC){

	let http=require("http");
	let URL=require("url");

	let LOG=require("./logger");
	let config=require("./config");
	let backGardener=require("./backGardener");

	SC=SC({
		File:"File",
		fileUtils:"File/util",
		fillResponse:require.bind(null,"./fillResponse"),
		mimeType:require.bind(null,"../util/mimeType"),
		gui:require.bind(null,"morgas.gui")
	});

	let logger=LOG("main");
	let accessLogger=LOG("access");

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
			else if(!backGardener.handleRequest(requestPath[0],request,response,requestPath.slice(1)))
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
					SC.fillResponse(response,SC.gui.getTheme(requestPath[4]),{"Content-Type":SC.mimeType.get(".css")});
				}
				else
				{
					//TODO pass component's theme
					SC.fillResponse(response,SC.gui.getComponentStyle(requestPath[3],requestPath[4]),{"Content-Type":SC.mimeType.get(".css")});
				}
			}
			else
			{
				SC.fillResponse(response,new SC.File(SC.gui.dirname).changePath(requestPath.slice(2).join("/")));
			}
		}
		else SC.fillResponse(response,new SC.File(µ.dirname).changePath(requestPath.slice(1).join("/")));
	};

	module.exports=function(port)
	{
		logger.info(`starting server with port ${port}`);
		return new Promise(function(resolve,reject)
		{
			let server=http.createServer(handleRequest);
			server.listen(port,function(e)
			{
				if(e)
				{
					logger.error({error:e},`failed to start server with port ${port}`);
					reject(e);
				}
				else
				{
					logger.info(`server started [${port}]`);
					resolve(server);
				}
			});
		});
	};


})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);