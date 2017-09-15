let µ=require("Morgas");
(function(µ,SMOD,GMOD,HMOD,SC){

	let WORKER=GMOD("nodeWorker");

	SC=SC({
		File:"File",
		Promise:"Promise",
		fillResponse:require.bind(null,"./fillResponse")
	});

	let LOG=require("../logger");

	let URL=require("url");
	let querystring=require("querystring");

	let NIWAapp=µ.Class(WORKER,{
		constructor:function(context,path)
		{
			this.logger=LOG("main").child({app:context});
			this.context=context;
			this.niwaConfig=null;
			this.folder=new SC.File(path);
			this.mega({
				script:new SC.File(__dirname).changePath("NIWAappWorker").filePath,
				param:{context:context}
				cwd:this.folder.getAbsolutePath();
			});

			this.ready=this.ready.then(function(data)
			{
				this.logger.info({initData:data},"started");
				return this.request("getNiwaConfig");
			},
			function(error)
			{
				this.logger.error({error:error},"error starting");
				return Promise.reject(error);
			});
			this.ready.then(niwaConfig=>this.niwaConfig=niwaConfig);

			this.eventSources=new Map();

			// ping events for eventSources
			setInterval(()=>
			{
				for(let context of this.eventSources.keys())
				{
					this.sendEvent(context,"ping",process.uptime());
				}
			},60000).unref();

			this.addListener("workerMessage",this,function(message)
			{
				switch(message.type)
				{
					case "triggerEventSource":
						this.sendEvent(message.name,message.event,message.data);
						break;
				}
			});
		},
		rest:function(request,path)
		{
			return new SC.Promise(function(signal)
			{
				let data="";
				request.on("data",d=>data+=d);
				request.on("end",function()
				{
					if(data=="") data=null;
					else  try
					{
						data=JSON.parse(data);
					}
					catch (e)
					{
						signal.reject(e);
					}
					signal.resolve(data);
				});
				request.on("error",(e)=>signal.reject(e));
			})
			.then(data=>
				this.request("restCall",[{
					method:request.method,
					headers:request.headers,
					path:path,
					query:URL.parse(request.url,true).query,
					data:data
				}]).catch(error=>
				{
					if(error=="timeout") error={error:"Request Timeout",status:408};
					return Promise.reject(error);
				})
			,
			error=>Promise.reject({error:error,status:500}));
		},
		sendEvent:function(name,event,data)
		{
			let eventSource=this.eventSources.get(name);
			if(eventSource)
			{
				data=JSON.stringify(data);
				for(let response of eventSource)
				{
					response.write(String.raw
`event: ${event}
data: ${data}

`					);
				}
			}
		},
		eventSource:function(request,name,response)
		{
			this.request("getEventSourceData",[name]).then(function(initData)
			{
				if(initData==null) return Promise.reject("no such eventSource "+name);
				else if(request.headers.accept==="text/event-stream")
				{
					response.writeHead(200, {"Content-Type":"text/event-stream", "Cache-Control":"no-cache", "Connection":"keep-alive"});
					response.write(String.raw
`retry: 5000
event: init
data: ${JSON.stringify(initData)}

`					);

					let eventSources=this.eventSources.get(name)||[];
					this.eventSources.set(name,eventSources);
					eventSources.push(response);
					request.connection.addListener("close", function ()
					{
						let index=eventSources.indexOf(response);
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
				µ.logger.error({error:e});
				SC.fillResponse(response,e,null,404);
			})
		},
		getAppState:function()
		{
			return this.getState(".readyState").value;
		},
		less:function(filePath,query)
		{
			return this.request("less",[{
				path:filePath,
				query:query
			}]).catch(error=>
			{
				if(error=="timeout") error={error:"Request Timeout",status:408};
				return Promise.reject(error);
			});
		}
	});
	module.exports=SMOD("NIWAapp",NIWAapp);

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
