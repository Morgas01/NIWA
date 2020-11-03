let µ=require("morgas");
let SC=µ.shortcut({
	File:"File",
	mimeType:require.bind(null,"../util/mimeType"),
	ServiceResult:require.bind(null,"../util/ServiceResult")
});

module.exports=function fillResponse(response,data)
{
	if(data instanceof SC.File)
	{
		data.stat().then(stat=>
		{
			if(stat.isFile())
			{
				response.writeHead(200,{
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
	else if(data instanceof SC.ServiceResult)
	{
		let result=data;
		let json=JSON.stringify(result.data);

		response.writeHead(result.status, Object.assign({
			"Content-Type":"application/json; charset=utf-8",
			"Content-Length":Buffer.byteLength(json, 'utf8')
		},result.headers));
		response.end(json);
	}
	else if(data instanceof Error) fillResponse(response,SC.ServiceResult.wrapError(data));
	else fillResponse(response,SC.ServiceResult.wrap(data));
};
