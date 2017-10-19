(function(µ,SMOD,GMOD,HMOD,SC){

	SC=SC({
		es:"errorSerializer"
	});

	let ServiceResult=µ.Class({
		constructor:function({status=200,headers={},data=null}={})
		{
			this.data=data
			this.headers=headers;
			this.status=status;
		},
		setHeaders:function(headers={})
		{
			this.headers=headers;
		},
		assignHeaders:function(headers={})
		{
			Object.assign(this.headers,headers);
		}
	});

	ServiceResult.wrap=function(data)
	{
		if(data!=null&&data instanceof ServiceResult)
		{
			return data;
		}
		return new ServiceResult({data:data});
	};

	ServiceResult.wrapError=function(error)
	{
		if(error!=null&&error instanceof Error)
		{
			return new ServiceResult({data:SC.es(error),status:500});
		}
		let result=ServiceResult.wrap(error);
		if(result.status==200) result.status=500;
		return result;
	};

	/**
	 * if data is similar to ServiceResult structure, create a new instance.
	 * designed for Promise.catch()
	 */
	ServiceResult.parse=function(data)
	{
		if(typeof data==="object"&&data!==null&&"data" in data && "status" in data)
		{
			data=new ServiceResult(data);
			if(data.status==200) data.status=500;
		}
		throw data;
	}

	SMOD("ServiceResult",ServiceResult);
	module.exports=ServiceResult;

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);