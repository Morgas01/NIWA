module.exports=async function(request)
{
	let data="";
	for await (let chunk of request)
	{
		data+=chunk;
	}
	return data;
};