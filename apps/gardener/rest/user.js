(function(µ,SMOD,GMOD,HMOD,SC){

	SC=SC({
		ServiceResult:"ServiceResult"
	});

	module.exports={
		getCurrentName:function(param)
		{
			return worker.module("session","get",[param.data])
			.then(function(session)
			{
				if(session.user) return session.user.name;
				return new SC.ServiceResult({data:"not logged in",status:400});
			});
		},
		logIn:async function(param)
		{
			param.data.token=(await worker.module("session","getOrCreate",[param.data.token])).token;
			await worker.module("user","logIn",[param.data.token,param.data.username,param.data.password]);
			return param.data.token;
		},
		logOut:function(param)
		{
			return worker.module("user","logOut",[param.data]);
		},
		config:function(param)
		{
			return worker.module("permissions","getAll",[param.data]);
		}
	};

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);