let µ=require("Morgas");

µ.getModule("Worker/BaseWorker");

let Path=require("path");
µ.addResourceFolder(Path.resolve(__dirname,"..","util"));

let SC=µ.shortcut({
	File:"File",
	Promise:"Promise",
	es:"errorSerializer",
	less:require.bind(null,"less"),
	gui:require.bind(null,"MorgasGui"),
	ServiceResult:"ServiceResult"
});

let LOG=require("../logger");

let rest={};

worker.initialize.then(function(param)
{
	worker.context=param.context;
	LOG.setCoreLogger(LOG("apps/"+param.context));
});

let startRestServices=function()
{
	return new SC.File("rest").exists()
	.then(function()
	{
		return this.listFiles().then(files=>
			files.filter(s=>s.slice(-3)===".js").map(s=>s.slice(0,-3))//cut ".js"
			.forEach(script=>
				rest[script]=require(new SC.File("./rest").changePath(script).getAbsolutePath())
			)
		);
	},
	function()
	{
		µ.logger.info("'rest' folder does not exist");
	});
};
let callAppSetup=function(setupPath)
{
	try
	{
		return Promise.resolve(require(Path.resolve(".",setupPath)));
	}
	catch(error)
	{
		return Promise.reject(error);
	}
};

let niwaConfig=new SC.File("package.json").exists()
.then(function()
{
	return this.read().then(JSON.parse)
	.then(function(json)
	{
		let config=json.niwa||{};
		if(!("name" in config)) config.name=json.name;
		worker.appName=config.name;
		return config;
	});
},
function(){return {}; })
.then(async function(config)
{
	if("setup" in config) await callAppSetup(config.setup);

	await startRestServices();

	return config;
});
niwaConfig.catch(function(error)
{
	µ.logger.error({error:error}, "error while setting up appWorker");
});
worker.getNiwaConfig=function()
{
	return niwaConfig;
};


worker.restCall=function(param)
{
	if(param.path.length==0)
	{//print all rest services
		return JSON.stringify(rest,function(key,value)
		{
			if(value instanceof Function) return value.toString().match(/^[^\(]+[^,]*,?([^\)]*)/)[1].split(",").map(s=>s.trim()).filter(s=>s!="");
			return value;
		});
	}
	else
	{
		let method=rest;
		let i=0;
		while(method&&typeof method!="function")
		{
			method=method[param.path[i++]];
		}
		if(!method)
		{
			param.status=404;
			return Promise.reject({error:"no such method: "+param.path.slice(0,i).join("/")});
		}
		else
		{
			param.path=param.path.slice(i);
			param.headers=null;
			param.status=null;
			return new SC.Promise(method,{args:[param].concat(param.path),simple:true})
			.then(SC.ServiceResult.wrap,SC.ServiceResult.wrapError);
		}
	}
};
worker.less=function({path,query})
{
	return SC.less.render(`@import "${path}";`,worker.less.options)
	.then(data=>data.css,error=>Promise.reject({error:error,status:500}));
};
worker.less.options={
	paths:[SC.gui.lessFolder],
	sourceMapFileInline:true
};
worker.eventSourcesMap=new Map();
worker.eventSource=function(name,getter)
{
	let trigger=function(eventName,data)
	{
		worker.message({type:"triggerEventSource",name:name,event:eventName,data:data});
	};
	worker.eventSourcesMap.set(name,{getter:getter,trigger:trigger});
	return trigger;
};
worker.getEventSourceData=function(name)
{
	let eventSource=worker.eventSourcesMap.get(name);
	return eventSource?eventSource.getter():undefined;
};

worker.ask=function(name,method,data)
{
	return worker.feedback({name:name,method:method,data:data});
};
worker.module=function(moduleName,methodName,args=[])
{
	return worker.ask("NIWA","module",{module:moduleName,method:methodName,args:args})
	.catch(SC.ServiceResult.parse);
};

worker.appsStarted=function(appNamesDict)
{
	worker.appNamesDict=appNamesDict;
};