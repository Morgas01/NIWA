let Morgas=require("morgas");
(function(µ,SMOD,GMOD,HMOD,SC)
{
	let Worker=GMOD("nodeWorker");
	let SC=SC({
		path:require.bind(null,"path"),
		gatherData:require.bind(null,"../util/gatherData"),
	});

	let Field=µ.class.extend(Worker,{
		constructor:function({path,name=SC.path.basename(path),neighbors=[]}={})
		{
			this.mega({
				autoStart:false,
				initScripts:SC.Path.resolve(__dirname,"fieldWorker"),
				cwd:path,
			});
			this.path=path;
			this.name=name;
			this.neighbors=neighbors;

			this.eventSourceMap=new Map();

			// ping events for eventSources //TODO listen to state for open and close
			this.pingInterval=setInterval(()=>
			{
				for(let context of this.eventSourceMap.keys())
				{
					this.sendEvent(context,"ping",process.uptime());
				}
			},60000).unref();

			this.addEventListener("workerMessage",this,function(message)
			{
				let param=message.data;
				switch(message.type)
				{
					case "eventData":
						this.sendEvent(param.name,param.event,param.data);
						break;
				}
			});
		},
		//TODO _start wrapper for initial this._getNeighborMap()?
		setNeighbors(neighbors)
		{
			this.neighbors=neighbors;
			this.send("neighborsChanged",[this._getNeighborMap()]); //TODO getter
		},
		async guideGuest(request,response,fieldPart)
		{
			let result=null;
			try
			{
				switch (fieldPart[0])
				{
					case "rest":
						result=await this.guideRest(request, fieldPart.slice(1));
						break;
					case "event":
						this.guideEvent(response, fieldPart.slice(1));
						return;
						break;
					case "less": //TODO
					default: //resource
						result = new SC.File(this.path).changePath(fieldPart.join("/"));
				}
			}
			catch (e)
			{
				result=e;
			}
			SC.fillResponse(response, result);
		},
		async guideRest(request, fieldPart)
		{
			return this.request("rest",[{
				method:request.method,
				path:fieldPart,
				query:SC.url.parse(request.url,true).query,
				headers:request.headers,
				data:await SC.gatherData(request)
			}]);
		},
		async guideEvent(response, fieldPart)
		{
			let eventName=fieldPart.join("/");
			let data=await this.request("getEventSourceData",[name]);
			if(!data)
			{
				return new SC.ServiceResult({status:404,data:"no such EventSource"});
			}
			if(request.headers.accept==="text/event-stream")
			{
				response.writeHead(200, {"Content-Type":"text/event-stream", "Cache-Control":"no-cache", "Connection":"keep-alive"});
				response.write(
	`retry: 5000
	event: init
	data: ${JSON.stringify(data)}
	
	`			);

				if(!this.eventSourceMap.has(name))
				{
					this.eventSourceMap.set([]);
				}
				let responses=this.eventSourceMap.get(name);
				responses.push(response);
				response.connection.addListener("close", function ()
				{
					let index=responses.indexOf(response);
					if(index===-1)this.logger.error("could not find response in eventSources");
					else responses.splice(index,1);
				});
			}
			else
			{//get request
				SC.fillResponse(response,data);
			}
		},
		sendEvent(name,event,data)
		{
			if(this.eventSourceMap.has(name))
			{
				let responses=this.eventSourceMap.get(name);
				data=JSON.stringify(data);
				for(let response of responses)
				{
					response.write(
	`event: ${event}
	data: ${data}
	
	`				);
				}
			}
			//TODO else log error
		},
		onFeedback({name,method,args,timeout=Field.defaults.TIMEOUT})
		{
			let neighbor=this.neighbors.find(n=>n.name===name);
			if(!neighbor)
			{
				return Promise.reject("no such Neighbor");
			}
			return neighbor.helpNeighbor(method,args,timeout);
		},
		helpNeighbor(method,args,timeout)
		{
			return this.request("helpNeighbor",[{method,args}],timeout);
		}
	});
	Field.defaults={
		TIMEOUT:6e4
	};

	module.exports=Field;

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);