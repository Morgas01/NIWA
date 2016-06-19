(function(µ,SMOD,GMOD,HMOD,SC){
	
	var WORKER=GMOD("nodeWorker");
	
	SC=SC({
		File:"File",
		Promise:"Promise",
		fillResponse:require.bind(null,"./lib/fillResponse")
	});
	
	var LOG=require("./logger");

	var URL=require("url");
	var querystring=require("querystring");
	
	var NIWAapp=µ.Class(WORKER,{
		init:function(name,path)
		{
			this.logger=LOG("main").child({app:name});
			this.folder=new SC.File(path);
			this.mega(new SC.File(__dirname).changePath("NIWAappWorker").filePath,{name:name},path);
			this.eventSources=new Map();
			
			this.stateGuard=SC.Promise.open(this);
			
			this.addListener(".readyState",this,function(event)
			{
				switch(event.value.state)
				{
					case "running":
						this.logger.info({initData:event.value.data},"started");
						this.stateGuard.resolve(event.value.data);
						break;
					case "error":
						this.logger.error({error:event.value.error},"error");
						this.stateGuard.reject(event.value.error);
						this.stateGuard=SC.Promise.reject(null,this);
						break;
				}
			});
			setInterval(()=>
			{
				for(var context of this.eventSources.keys())
				{
					this.sendEvent(context,"ping",process.uptime())
				}
			},60000).unref();
			this.addListener("message",this,function(message)
			{
				if(message.event)
				{
					this.sendEvent(message.context,message.event,message.data);
				}
			});
		},
		rest:function(request,path)
		{
			return new SC.Promise([function(signal)
			{
				var data="";
				request.on("data",d=>data+=d);
				request.on("end",()=>signal.resolve(data==""?null:JSON.parse(data)));
				request.on("error",(e)=>signal.reject(e));
			},this.stateGuard])
			.then((data)=>
				this.request("restCall",{
					method:request.method,
					headers:request.headers,
					path:path,
					query:querystring.parse(URL.parse(request.url).query),
					data:data
				})
			,
			error=>Promise.reject({data:error,status:500}));
		},
		sendEvent:function(context, event, data)
		{
			var eventSource=this.eventSources.get(context);
			if(eventSource)
			{
				data=JSON.stringify(data);
				for(var response of eventSource)
				{
					response.write(String.raw
`event: ${event}
data: ${data}

`					);
				}
			}
		},
		eventSource:function(request,context,response)
		{
			this.request("getEventData",context).then(function(initData)
			{
				if(initData==null) return Promise.reject("no such context "+context);
				else if(request.headers.accept==="text/event-stream")
				{
					response.writeHead(200, {"Content-Type":"text/event-stream", "Cache-Control":"no-cache", "Connection":"keep-alive"});
					response.write(String.raw
`retry: 5000
event: init
data: ${JSON.stringify(initData)}

`					);
					
					var eventSources=this.eventSources.get(context)||[];
					this.eventSources.set(context,eventSources);
					eventSources.push(response);
					request.connection.addListener("close", function ()
					{
						var index=eventSources.indexOf(response);
						if(index===-1)this.logger.error("could not find response in eventSources");
						else eventSources.splice(index,1);
					});
				}
				else
				{//get request
					SC.fillResponse(response,initData);
				}
			})
			.catch(function(e)
			{
				SC.fillResponse(response,e,null,404);
			})
		}
	});
	module.exports=SMOD("NIWAapp",NIWAapp);
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);