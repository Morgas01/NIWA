
var SC=µ.shortcut({
	File:"File"
});
var LOG=require("./logger");
var logger;

var rest={};

worker.init=function(param)
{
	logger=LOG.setCoreLogger(LOG("apps/"+param.name));
	
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
		return "'rest' folder does not exist";
	})
	.catch(e=>
	{
		setTimeout(function(){throw e;},1) //for native error message
		return Promise.reject(LOG.errorSerializer(e));
	});
}
worker.restCall=function(param)
{
	if(param.path.length==0)
	{
		return JSON.stringify(rest,function(key,value)
		{
			if(value instanceof Function) return value.toString().match(/^[^\(]+[^,]*,?([^\)]*)/)[1].split(",").map(s=>s.trim()).filter(s=>s!="");
			return value;
		});
	}
	else
	{
		var method=rest;
		var i=0;
		while(method&&typeof method!="function")
		{
			method=method[param.path[i++]];
		}
		if(!method)
		{
			return Promise.reject({data:"no such method: "+param.path.slice(0,i)});
		}
		else
		{
			param.path=param.path.slice(i);
			param.headers=null;
			param.status=null;
			return Promise.resolve(method.apply(null,[param].concat(param.path)))
			.then(data=>({data:data,headers:param.headers,status:param.status}),
			error=>Promise.reject({error:LOG.errorSerializer(error),headers:param.headers,status:param.status})
			);
		}
	}
};
worker.eventData=new Map();
worker.event=function(context,data,event,eventData)
{
	worker.eventData.set(context,data);
	worker.send({context:context,event:event,data:eventData});
};
worker.getEventData=worker.eventData.get.bind(worker.eventData);