(function(µ,SMOD,GMOD,HMOD,SC){

	let File=GMOD("File");

	SC=SC({
		util:"File.util",
		ServiceResult:require.bind(null,"../util/ServiceResult"),
		Session:require.bind(null,"./session")
	});

	let permissionsFile=new File(__dirname).changePath("../config/permissions.json");

	module.exports={
		get:function(username)
		{
			return permissionsFile.exists()
			.then(permissionsFile.read)
			.then(JSON.parse)
			.then(function(permissions)
			{
				if (!permissions.users[username]) return new Set();

				let user=permissions.users[username];

				let userPermissions=new Set(user.permissions);
				let roles=new Set(user.roles);
				for(let role of roles)
				{
					let roleData=permissions.roles[role];
					roleData.permissions.forEach(p=>userPermissions.add(p));
					roleData.roles.forEach(r=>roles.add(r));
				}
				return userPermissions;
			});
		},
		check:async function(sessionToken,toCheck=[])
		{
			let session;
			try
			{
				session=await SC.Session.get();
			}
			catch(e)
			{
				e=SC.ServiceResult.wrapError(e);
				e.status=403;
				throw e;
			}
			let username="";
			if(session.user!=null) username=session.user.name;
			let permissions= await module.exports.get(username);

			if(!toCheck.every(p=>permissions.has(p)))
			{
				throw new SC.ServiceResult({data:"Forbidden",status:403});
			}
		}
	};

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
