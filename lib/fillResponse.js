
var SC=µ.shortcut({
	File:"File",
	adopt:"adopt"
});

var getMimeType=function(file)
{
	switch(file.getExt())
	{
		case ".html":	return "text/html";
		case ".css":	return "text/css";
		case ".js":		return "application/javascript";
		case ".svg":	return "image/svg+xml";
		default : 		return "application/octet-stream";
	}
};

module.exports=function fillResponse(response,data,headers,status)
{
	if(data instanceof SC.File)
	{
		data.stat().then(stat=>
		{
			if(stat.isFile())
			{
				response.writeHead(status||200,{
					"Content-Type":getMimeType(data),
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
	else if(data instanceof Error) fillResponse(response,data.message+"\n\n"+data.stack,null,status||500);
	else if (data instanceof Object) fillResponse(response,JSON.stringify(data),{"Content-Type":"application/json"});
	else
	{
		if(data==undefined)data="";
		else data+="";
		response.writeHead(status||200, SC.adopt.setDefaults({
			"Content-Type":"text/plain",
			"Content-Length":Buffer.byteLength(data, 'utf8')
		},headers,true));
		response.end(data);
	}
};