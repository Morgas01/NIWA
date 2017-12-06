let µ=require("morgas");
let SC=µ.shortcut({
	File:"File",
	adopt:"adopt",
	Promise:"Promise",
	mimeType:require.bind(null,"../util/mimeType"),
});

module.exports=function fillResponse(response,data,headers,status)
{
	if(SC.Promise.isThenable(data))
	{
		return data.then(result=>fillResponse(response,result,headers,status),error=>fillResponse(response,error,headers,status||404));
	}
	else if(data instanceof SC.File)
	{
		data.stat().then(stat=>
		{
			if(stat.isFile())
			{
				response.writeHead(status||200,{
					"Content-Type":SC.mimeType.get(data.getExt())+"; charset=utf-8",
					"Content-Length":stat.size
				});
				return data.readStream()
				.then(stream=>stream.pipe(response));
			}
			else
			{
				return Promise.reject(data.filePath+" is not a file");
			}
		})
		.catch(function(e)
		{//error
			fillResponse(response,e,null,404);
		});
	}
	else if(data instanceof Error) fillResponse(response,data.message+"\n\n"+data.stack,headers,status||500);
	else if (data instanceof Object) fillResponse(response,JSON.stringify(data),SC.adopt({"Content-Type":"application/json; charset=utf-8"},headers,true),status);
	else
	{
		if(data==undefined)data="";
		else data+="";
		response.writeHead(status||200, SC.adopt.setDefaults({
			"Content-Type":"text/plain; charset=utf-8",
			"Content-Length":Buffer.byteLength(data, 'utf8')
		},headers,true));
		response.end(data);
	}
};
