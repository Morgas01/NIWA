module.exports=async function(request)
{
	let chunks=[];
	for await (let chunk of request)
	{
		chunks.push(chunk);
	}
	return Buffer.concat(chunks);
};