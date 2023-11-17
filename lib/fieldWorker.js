let path=require("path");
µ.addResourceFolder(path.resolve(__dirname,"..","util"));

let SC=µ.shortcut({
	fs:require.bind(null,"fs"),
	Promise:"Promise",
	es:"errorSerializer",
	gui:require.bind(null,"morgas.gui"),
	logger:require.bind(null,"./logger"),
	ServiceResult:"ServiceResult",
	encase:"encase"
});

worker.shed=worker.config.shed;

worker.logger=SC.logger(worker.shed,worker.config.name,worker.config.name,worker.config.loglevel);

worker.config.type=[];
if(SC.fs.existsSync("niwa.json"))
{
	try
	{
		let config=JSON.parse(SC.fs.readFileSync("niwa.json",{encoding:"utf-8"}));
		worker.config.type=SC.encase(config.type);

		if(config.setup)
		{
			try
			{
				require(path.resolve(".",config.setup));
			}
			catch (e)
			{
				worker.logger.error("error in setup:",e);
			}
		}
	}
	catch(e)
	{
		worker.logger.warn("could not load niwa.json",e);
	}
}

worker.methods.rest=async function(param)
{
	param.fullPath=param.path.slice();
	let method=rest;
	while(typeof method=="object" && param.path[0] in method)
	{
		method=method[param.path.shift()];
	}
	if(typeof method==="function")
	{
		try
		{
			return SC.ServiceResult.wrap(await method(param));
		}
		catch(error)
		{
			return SC.ServiceResult.wrapError(error);
		}
	}
	else
	{
		return new SC.ServiceResult({status:400,data:"unknown endpoint: "+param.fullPath});
	}
};

let eventSourcesMap=worker._eventSourcesMap=new Map();
worker.eventSource=function(name,getter)
{
	let trigger=function(eventName,data)
	{
		worker._send({type:MESSAGE_TYPES.MESSAGE,data:{type:"eventData",name:name,event:eventName,data:data}});
	};
	eventSourcesMap.set(name,{getter,trigger});
	return trigger;
};
worker.methods.getEventSourceData=function(name)
{
	let eventSource=eventSourcesMap.get(name);
	return eventSource?eventSource.getter():undefined;
};
worker.getNeighbors=function()
{
	return worker.feedback("neighborList");
};
worker.askNeighbor=function(name,method,data,timeout)
{
	return worker.feedback({name:name,method:method,data:data},timeout);
};

let rest={};
if(SC.fs.existsSync("rest"))
{
	let services={};
	let files=SC.fs.readdirSync("rest");
	files.filter(s=>s.slice(-3)===".js").map(s=>s.slice(0,-3))//cut ".js"
		.forEach(script=>
		{
			services[script] = require(path.resolve("rest",script));
		});
	rest=services;
}
else
{
	worker.logger.info("'rest' folder does not exist");
}