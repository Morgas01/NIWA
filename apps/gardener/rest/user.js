(function(µ,SMOD,GMOD,HMOD,SC){

	//SC=SC({});

	module.exports={
		getCurrentName:function(param)
		{
			return worker.module("session","get",[param.data])
			.then(function(session)
			{
				if(session.user) return session.user.name;
				return "";
			});
		},
		logIn:async function(param)
		{
			if(!param.data.token) param.data.token=(await worker.module("session","create")).token;
			await worker.module("user","logIn",[param.data.token,param.data.username,param.data.password]);
			return param.data.token;
		},
		logOut:function(param)
		{
			return worker.module("user","logOut",[param.data]);
		},
		list:function(param)
		{
			return worker.module("user","list",[param.data]);
		}
	};

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);