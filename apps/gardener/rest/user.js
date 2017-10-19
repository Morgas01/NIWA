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
			let key=null;
			if(param.path[0]) key=param.path[0][0].toUpperCase()+param.path[0].slice(1);
			switch(param.method)
			{
				case "GET":
					return worker.module("permissions","getAll",[param.query.session]);
				case "POST":
					switch(param.path[0])
					{
						case "user":
						return worker.module("users","register",[
							param.data.session,
							param.data.name,
							param.data.password
						])
						.then(()=>worker.module("permissions","addUser",[
							param.data.session,
							param.data.name,
							param.data.roles,
							param.data.permissions
						]));
						case "role":
						return worker.module("permissions","addRole",[
							param.data.session,
							param.data.name,
							param.data.roles,
							param.data.permissions
						]);
					}
					break;
				case "PUT":
					switch(param.path[0])
					{
						case "user":
						case "role":
						return worker.module("permissions","set"+key,[
							param.data.session,
							param.data.name,
							param.data.roles,
							param.data.permissions
						]);
					}
					break;
				case "DELETE":
					switch(param.path[0])
					{
						case "user":
						case "role":
						return worker.module("permissions","delete"+key,[
							param.data.session,
							param.data.name
						]);
					}
					break;
			}
			return new SC.ServiceResult({data:"unknown config context "+param.path[0],status:400});
		},

	};

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);