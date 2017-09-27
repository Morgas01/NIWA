
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
}
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
			user:null
		};
		sessionMap.set(token,entry);
		setTimer(entry);
		return entry;
	},
	get:function(token)
	{
		let entry=sessionMap.get(token);
		if(entry)
		{
			refreshTimer(entry);
		}
		return entry;
	},
	"delete":function(token)
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