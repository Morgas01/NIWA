let µ=require("morgas");
(function(µ,SMOD,GMOD,HMOD,SC){

	let WORKER=GMOD("nodeWorker");
	let Path=require("path");

	const WORKER_SCRIPT=Path.resolve(__dirname,"NIWAappWorker");

	SC=SC({
		Promise:"Promise",
		fillResponse:require.bind(null,"./fillResponse"),
		niwaWorkDir:"niwaWorkDir",
		AbstractWorker:"AbstractWorker",
		File:"File",
		fileUtil:"File/util"
	});

	let LOG=require("./logger");

	let URL=require("url");
	let querystring=require("querystring");

	let NIWAapp=µ.Class(WORKER,{
		constructor:function({
			context,
			path,
			autoStart,
			logLevel,
			serverPromise,
			startTimeout,
			loadScripts
		})
		{
			this.logger=LOG("main").child({app:context});
			this.context=context;
			this.niwaConfig=null;
			this.folder=path;
			this.serverPromise=serverPromise;
			this.niwaAppWorkDir=new SC.File(SC.niwaWorkDir).changePath("work",context);

			this.mega({
				script:WORKER_SCRIPT,
				param:{
					context:context,
					niwaWorkDir:SC.niwaWorkDir,
					niwaAppWorkDir:this.niwaAppWorkDir.getAbsolutePath(),
					logLevel:logLevel
				},
				cwd:Path.resolve(SC.niwaWorkDir,"apps",this.folder),
				autoStart:false //enshure niwaAppWorkDir first
			});

			this.eventSources=new Map();

			// ping events for eventSources
			this.pingInterval=setInterval(()=>
			{
				for(let context of this.eventSources.keys())
				{
					this.sendEvent(context,"ping",process.uptime());
				}
			},60000).unref();

			this.addEventListener("workerMessage",this,function(message)
			{
				switch(message.data.type)
				{
					case "triggerEventSource":
						this.sendEvent(message.data.name,message.data.event,message.data.data);
						break;
				}
			});

			SC.fileUtil.enshureDir(this.niwaAppWorkDir)
			.then(()=>
			{
				if(autoStart) this.restart();
			});
		},
		restart:function()
		{
			let p=this.mega();
			if(this.state==SC.AbstractWorker.states.START)
			{
				p=this.ready=this.ready.then((data)=>
				{
					this.logger.info({initData:data},"started");
					return this.request("getNiwaConfig");
				})
				.then((niwaConfig)=>
				{
					this.niwaConfig=niwaConfig;

					this.serverPromise.then(()=>this.send("serverStarted"))
					.catch(error=>logger.error({error:error}));
				},
				function(error)
				{
					this.logger.error({error:error},"error starting");
					return this.stop().catch(this.logger.error).then(()=>Promise.reject(error));
				});
			}
			return p;
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
					if(error=="timeout") return Promise.resolve({data:"Request Timeout",status:408});
					return Promise.reject(error);
				})
			);
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
		},
		destroy:function()
		{
			clearInterval(this.pingInterval);
			for(let responses of this.eventSources.values())
			{
				for(let response of responses)
				{
					response.end();
				}
			}
			this.eventSources.clear();
			this.mega();
		}
	});
	module.exports=SMOD("NIWAapp",NIWAapp);

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
