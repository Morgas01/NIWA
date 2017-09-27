(function(µ,SMOD,GMOD,HMOD,SC){

	let File=GMOD("File");

	SC=SC({
		util:"File.util",
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
		}
	};

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
