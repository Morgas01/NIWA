(function(µ,SMOD,GMOD,HMOD,SC){

	SC=SC({
		ServiceResult:"ServiceResult",
		Promise:"Promise",
		remove:"array.remove"
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
			param.data.token=(await worker.module("session","getOrCreate",[param.data.session])).token;
			await worker.module("user","logIn",[param.data.token,param.data.username,param.data.password]);
			return param.data.token;
		},
		logOut:function(param)
		{
			return worker.module("user","logOut",[param.data]);
		},
		config:function(param)
		{
			switch(param.method)
			{
				case "GET":
					return new SC.Promise([
						worker.module("user","list",[param.query.session]),
						worker.module("permissions","getAll",[param.query.session])
					])
					.then(function(userList,config)
					{
						let configUsers=Object.keys(config.users);
						for(let username of userList)
						{
							if(SC.remove(configUsers,username)==-1)
							{
								config.users[username]={noPermissions:true};
							}
						}
						return new SC.Promise(configUsers.map(function(user)
						{
							delete config[user];
							return worker.module("permissions","deleteUser",[
								param.query.session,
								user
							]);
						}))
						.then(()=>config);
					});
				case "POST":
					switch(param.path[0])
					{
						case "user":
						return worker.module("user","register",[
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
				case "PATCH":
					if(param.path[0]=="user")
					{
						return worker.module("permissions","addUser",[
							param.data.session,
							param.data.name,
							param.data.roles,
							param.data.permissions
						]);
					}
				case "PUT":
					let key=param.path[0][0].toUpperCase()+param.path[0].slice(1);
					switch(key)
					{
						case "User":
						case "Role":
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
						return worker.module("user","delete",[
							param.data.session,
							param.data.name
						]).then(()=>worker.module("permissions","deleteUser",[
							param.data.session,
							param.data.name
						]));
						case "role":
						return worker.module("permissions","deleteRole",[
							param.data.session,
							param.data.name
						]);
					}
					break;
			}
			return new SC.ServiceResult({data:"unknown config context "+param.path[0]+" for "+param.method,status:400});
		}
	};

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);