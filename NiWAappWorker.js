
var SC=µ.shortcut({
	File:"File"
});
var LOG=require("./logger");
var logger;

var rest={};

worker.init=function(param)
{
	logger=LOG.setCoreLogger(LOG("apps/"+param.name));
	
	return new SC.File("rest").listFiles().then(files=>
		files.filter(s=>s.slice(-3)===".js").map(s=>s.slice(0,-3))//cut ".js"
		.forEach(script=>
			rest[script]=require(new SC.File("./rest").changePath(script).getAbsolutePath())
		)
	);
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
			return Promise.resolve(method.apply(null,[param,param.path]))
			.then(data=>({data:data,headers:param.headers,status:param.status}),
			error=>Promise.reject({data:error,headers:param.headers,status:param.status}));
		}
	}
};