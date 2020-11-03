let path=require("path");
µ.addResourceFolder(path.resolve(__dirname,"..","util"));

let SC=µ.shortcut({
	fs:require.bind(null,"fs"),
	Promise:"Promise",
	es:"errorSerializer",
	gui:require.bind(null,"morgas.gui"),
	ServiceResult:"ServiceResult",
	encase:"encase"
});
worker.logger=µ.logger;//TODO

worker.config.type=[];
if(SC.fs.existsSync("niwa.json"))
{
	try
	{
		let config=JSON.parse(SC.fs.readFileSync("niwa.json",{encoding:"utf-8"}));
		worker.config.type=SC.encase(config.type);
	}
	catch(e)
	{
		worker.logger.warn("could not load niwa.json",e);
	}
}

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

worker.methods.rest=async function(param)
{
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
};

let eventSourcesMap=worker._eventSourcesMap=new Map();
worker.eventSource=function(name,getter)
{
	let trigger=function(eventName,data)
	{
		worker._send({type:"eventData",name:name,event:eventName,data:data});
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