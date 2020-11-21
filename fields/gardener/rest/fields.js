module.exports={
	list()
	{
		return worker.askNeighbor("owner","getFieldList");
	},
	async add(param)
	{

		if(!param.data)
		{
			return new SC.ServiceResult({status:400,data:'post: { path:"string",name:"string" (,autoOpen:"boolean",allowCommunicatio:"boolean",communicationList:["string"]) }'});
		}

		let data=JSON.parse(param.data);
		let error=await worker.askNeighbor("owner","addField",data).catch(e=>e);
		return {
			result:!error,
			error
		};
	},
	remove(param)
	{
		if(!param.data)
		{
			return new SC.ServiceResult({status:400,data:'post: {name:"string"}'});
		}

		let data=JSON.parse(param.data);
		let error=await worker.askNeighbor("owner","removeField",data.name).catch(e=>e);
		return {
			result:!error,
			error
		};
	},
	open(param)
	{
		if(!param.data)
		{
			return new SC.ServiceResult({status:400,data:'post: {name:"string"}'});
		}

		let data=JSON.parse(param.data);
		let error=await worker.askNeighbor("owner","openField",data.name).catch(e=>e);
		return {
			result:!error,
			error
		};
	},
	close(param)
	{
		if(!param.data)
		{
			return new SC.ServiceResult({status:400,data:'post: {name:"string"}'});
		}

		let data=JSON.parse(param.data);
		let error=await worker.askNeighbor("owner","closeField",data.name).catch(e=>e);
		return {
			result:!error,
			error
		};
	}
};