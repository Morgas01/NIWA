(function(µ,SMOD,GMOD,HMOD,SC){

	SC=SC({
		equal:"array.equal"
	});

	let sort=new Intl.Collator(navigator.languages,{sensitivity:"base"}).compare

	let UserRole=µ.Class({
		constructor:function(type,name,{roles=[],permissions=[],noPermissions=false}={})
		{
			this.type=type;
			this.name=name;
			this.roles=roles;
			this.permissions=permissions;
			this.noPermissions=noPermissions;
		},
		toString:function()
		{
			return this.name;
		},
		toJSON:function()
		{
			return {
				name:this.name,
				roles:this.roles.map(r=>r.name),
				permissions:this.permissions
			};
		},
		effectivePermissions:function()
		{
			let roles=new Set(this.roles)
			let permissions=new Set(this.permissions)
			for(let role of roles)
			{
				role.permissions.forEach(p=>permissions.add(p));
				role.roles.forEach(r=>roles.add(r));
			}
			return Array.from(permissions.values()).sort();
		}
	});

	UserRole.Types={
		USER:"USER",
		ROLE:"ROLE"
	}

	UserRole.parse=function(data)
	{
		let roleMap=new Map();

		let roles=data.roles;
		for(let name in roles)
		{
			roleMap.set(name,new UserRole(UserRole.Types.ROLE,name,roles[name]));
		}

		let rtn={
			users:Object.keys(data.users)
			.map(name=>new UserRole(UserRole.Types.USER,name,data.users[name]))
			.sort(sort),
			roles:[...roleMap.values()].sort(sort)
		}

		let getRole=roleMap.get.bind(roleMap);
		let todo=rtn.users.concat(rtn.roles);
		for (let userRole of todo)
		{
			userRole.roles=userRole.roles.map(getRole);
		}

		return rtn;
	};

	SMOD("UserRole",UserRole);

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);