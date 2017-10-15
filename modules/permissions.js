(function(µ,SMOD,GMOD,HMOD,SC){

	let File=GMOD("File");

	SC=SC({
		util:"File.util",
		ServiceResult:require.bind(null,"../util/ServiceResult"),
		Session:require.bind(null,"./session")
	});

	let permissionsFile=new File(__dirname).changePath("../config/permissions.json");

	let readFile=function(ignoreError)
	{
		return permissionsFile.exists()
		.then(permissionsFile.read,ignoreError?"{}":undefined)
		.then(JSON.parse);
	};
	let saveToFile=function(data)
	{
		return SC.util.enshureDir(permissionsFile.clone().changePath(".."))
		.then(()=>permissionsFile.write(JSON.stringify(data,null,"\t")));
	};

	let permissions={
		get:function(username)
		{
			return readFile()
			.then(function(permissionConfig)
			{
				if (!permissionConfig.users[username]) return new Set();

				let user=permissionConfig.users[username];

				let userPermissions=new Set(user.permissions);
				let roles=new Set(user.roles);
				for(let role of roles)
				{
					let roleData=permissionConfig.roles[role];
					roleData.permissions.forEach(p=>userPermissions.add(p));
					roleData.roles.forEach(r=>roles.add(r));
				}
				return userPermissions;
			});
		},
		check:async function(sessionToken,toCheck=[])
		{
			let session=await SC.Session.get(sessionToken);
			let username="";
			if(session.user!=null) username=session.user.name;
			let userPermissions=await permissions.get(username);

			if(!toCheck.every(p=>userPermissions.has(p)))
			{
				throw new SC.ServiceResult({data:"forbidden",status:403});
			}
		},
		getAll:function(sessionToken)
		{
			return module.exports.check(sessionToken,["readPermissions"])
			.then(()=>readFile());
		}
	};

	for(let type of ["User","Role"])
	{
		let key=type.toLowerCase()+"s";

		permissions["add"+type+"s"]=function(sessionToken,datas)
		{
			return permissions.check(sessionToken,["add"+type])
			.then(()=>readFile(true))
			.then(permissionConfig=>
			{
				for(let data of datas)
				{
					if(!data.roles) data.roles=[];
					if(!data.permissions) data.permissions=[];

					if (data.name in permissionConfig[key])
					{
						throw new SC.ServiceResult({data:type+" "+data.name+" exists",status:400});
					}
					else if(data.roles&&!data.roles.every(r=>r in permissionConfig.roles))
					{
						throw new SC.ServiceResult({data:"role of "+type+" "+data.name+" does not exists",status:400});
					}
					permissionConfig[key][data.name]={
						roles:data.roles,
						permissions:data.permissions
					};
				}
				return saveToFile(permissionConfig);
			});
		};

		permissions["set"+type+"s"]=function(sessionToken,datas)
		{
			return permissions.check(sessionToken,["set"+type])
			.then(()=>readFile(false))
			.then(permissionConfig=>
			{
				for(let data of datas)
				{
					if(!data.roles) data.roles=[];
					if(!data.permissions) data.permissions=[];

					if (!(data.name in permissionConfig[key]))
					{
						throw new SC.ServiceResult({data:type+" "+data.name+" does not exists",status:400});
					}
					else if(data.roles&&!data.roles.every(r=>r in permissionConfig.roles))
					{
						throw new SC.ServiceResult({data:"role of "+type+" "+data.name+" does not exists",status:400});
					}
					permissionConfig[key][data.name]={
						roles:data.roles,
						permissions:data.permissions
					};
				}
				return saveToFile(permissionConfig);
			});
		};

		permissions["delete"+type+"s"]=function(sessionToken,names)
		{
			return permissions.check(sessionToken,["delete"+type])
			.then(()=>readFile(false))
			.then(permissionConfig=>
			{
				for(let name of names)
				{
					if (!(name in permissionConfig[key]))
					{
						throw new SC.ServiceResult({data:type+" "+name+" does not exists",status:400});
					}

					delete permissionConfig[key][name];
				}
				return saveToFile(permissionConfig);
			});
		};
	}

	module.exports=permissions;
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
