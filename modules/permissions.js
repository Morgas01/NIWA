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
		.then(permissionsFile.read,()=>ignoreError?"{}":undefined)
		.then(JSON.parse);
	};
	let saveToFile=function(data)
	{
		return SC.util.enshureDir(permissionsFile.clone().changePath(".."))
		.then(()=>permissionsFile.write(JSON.stringify(data,null,"\t")));
	};

	let permissionsModule={
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
		check:async function(sessionToken,toCheck)
		{
			toCheck=toCheck||[];

			let session=await SC.Session.get(sessionToken);
			let username="";
			if(session.user!=null) username=session.user.name;
			let userPermissions=await permissionsModule.get(username);

			if(!toCheck.every(p=>userPermissions.has(p)))
			{
				throw new SC.ServiceResult({data:"forbidden",status:403});
			}
		},
		getAll:function(sessionToken)
		{
			return module.exports.check(sessionToken,["readPermissions"])
			.then(()=>readFile());
		},
		deleteUser:function(sessionToken,name)
		{
			return permissionsModule.check(sessionToken,["deleteUser"])
			.then(()=>readFile(false))
			.then(permissionConfig=>
			{
				if (!(name in permissionConfig.users))
				{
					return new SC.ServiceResult({status:205});
				}

				delete permissionConfig.users[name];
				return saveToFile(permissionConfig);
			});
		},
		deleteRole:function(sessionToken,name)
		{
			return permissionsModule.check(sessionToken,["deleteRole"])
			.then(()=>readFile(false))
			.then(permissionConfig=>
			{
				if (!(name in permissionConfig.roles))
				{
					return new SC.ServiceResult({status:205});
				}
				let referenceUsers=getReferences(permissionConfig,"users",name);
				let referenceRoles=getReferences(permissionConfig,"roles",name);

				let message="";
				if(referenceUsers.length>0)
				{
					message+="User"+(referenceUsers.length>1?"s ":" ")+referenceUsers+" ";
				}
				if(referenceRoles.length>0)
				{
					if(message) message+="and ";
					message+="Role"+(referenceRoles.length>1?"s ":" ")+referenceRoles+" ";
				}
				if(message)
				{
					message+="hold references to Role "+name;
					throw new SC.ServiceResult({data:message,status:400});
				}

				delete permissionConfig.roles[name];
				return saveToFile(permissionConfig);
			});
		}
	};

	let getReferences=function(permissionConfig,type,name)
	{
		let rtn=[];
		for( let key in permissionConfig[type])
		{
			if(permissionConfig[type][key].roles.includes(name))
			{
				rtn.push(key);
			}
		}
		return rtn;
	}

	for(let type of ["User","Role"])
	{
		let key=type.toLowerCase()+"s";

		permissionsModule["add"+type]=function(sessionToken,name,roles,permissions)
		{
			roles=roles||[];
			permissions=permissions||[];

			return permissionsModule.check(sessionToken,["add"+type])
			.then(()=>readFile(true))
			.then(permissionConfig=>
			{
				if (name in permissionConfig[key])
				{
					throw new SC.ServiceResult({data:type+" "+name+" exists",status:400});
				}
				else if(!roles.every(r=>r in permissionConfig.roles))
				{
					throw new SC.ServiceResult({data:"role of "+type+" "+name+" does not exists",status:400});
				}
				permissionConfig[key][name]={
					roles:roles,
					permissions:permissions
				};
				return saveToFile(permissionConfig);
			});
		};

		permissionsModule["set"+type]=function(sessionToken,name,roles,permissions)
		{
			roles=roles||[];
			permissions=permissions||[];

			return permissionsModule.check(sessionToken,["set"+type])
			.then(()=>readFile(false))
			.then(permissionConfig=>
			{
				if (!(name in permissionConfig[key]))
				{
					throw new SC.ServiceResult({data:type+" "+name+" does not exists",status:400});
				}
				else if(!roles.every(r=>r in permissionConfig.roles))
				{
					throw new SC.ServiceResult({data:"role of "+type+" "+name+" does not exists",status:400});
				}
				permissionConfig[key][name]={
					roles:roles,
					permissions:permissions
				};
				return saveToFile(permissionConfig);
			});
		};
	}

	module.exports=permissionsModule;
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
