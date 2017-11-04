(function(µ,SMOD,GMOD,HMOD,SC){

	SC=SC({
		ServiceResult:require.bind(null,"../util/ServiceResult")
	});

	let sessionMap=new Map();
	let timerMap=new WeakMap();
	let getToken=function()
	{
		let token;
		do
		{
			token=new Uint8Array(50).reduce(s=>s+(Math.random()*36|0).toString(36).toUpperCase(),"");
		} while(sessionMap.has(token));
		return token;
	};
	let setTimer=function(entry)
	{
		let timer=setTimeout(()=>sessionMap.delete(entry.token),module.exports.timeout);
		timer.unref();
		timerMap.set(entry,timer);
	};
	let removeTimer=function(entry)
	{
		clearTimeout(timerMap.get(entry));
	};
	let refreshTimer=function(entry)
	{
		removeTimer(entry);
		setTimer(entry);
	};

	module.exports={
		timeout:1800000, //30 min
		create:function()
		{
			let token=getToken();
			let entry={
				token:token,
				user:{
					name:"" // guest user
				}
			};
			sessionMap.set(token,entry);
			setTimer(entry);
			return entry;
		},
		get:async function(token)
		{
			let entry=sessionMap.get(token);
			if(entry)
			{
				refreshTimer(entry);
				return entry;
			}
			throw new SC.ServiceResult({data:"no session",status:400});
		},
		getOrCreate:function(token)
		{
			if(sessionMap.has(token)) return module.exports.get(token);
			else return module.exports.create();
		},
		"delete":async function(token)
		{
			let entry=sessionMap.get(token);
			if(entry)
			{
				removeTimer(entry);
			}
			return sessionMap.delete(token);
		},
		refresh:function(token)
		{
			return module.exports.get(token)!=null;
		}
	};

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
