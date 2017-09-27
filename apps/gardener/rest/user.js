(function(µ,SMOD,GMOD,HMOD,SC){

	//SC=SC({});

	module.exports={
		getCurrentName:function(param)
		{
			return worker.module("session","get",[param.data])
			.then(function(session)
			{
				if(!session) return Promise.reject("no session");
				if(session.user) return session.user.name;
				return "";
			});
		},
		logIn:function(param)
		{
			let sessionPromise=null;
			if(param.token) sessionPromise=worker.module("session","get",[param.data.token]);
			else sessionPromise=worker.module("session","create");

			return sessionPromise.then(function(session)
			{
				if(session.user)
				{
					return Promise.reject("logged in");
				}
				else
				{
					return worker.module("user","logIn",[session.token,param.data.username,param.data.password])
					.then(function()
					{
						return session.token;
					});
				}
			});
		},
		logOut:function(param)
		{
			return worker.module("user","logOut",[param.data]);
		}
	}

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);