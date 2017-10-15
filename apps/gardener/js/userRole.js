(function(µ,SMOD,GMOD,HMOD,SC){

	SC=SC({
		equal:"array.equal"
	});

	let sort=new Intl.Collator(navigator.languages,{sensitivity:"base"}).compare

	let UserRole=µ.Class({
		constructor:function(type,name,original)
		{
			this.type=type;
			this.name=name;
			this.original=original;

			if(!original) original={roles:[],permissions:[]};
			this.roles=original.roles.slice();
			this.permissions=original.permissions.slice();
		},
		hasChanges:function()
		{
			return !this.original
			||
			!SC.equal(this.roles,this.original.roles)
			||
			!SC.equal(this.permissions,this.original.permissions);
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
			return this.permissions.concat(...this.roles.map(r=>r.effectivePermissions()));
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
			roles:[..roleMap.values()].sort(sort)
		}

		let todo=rtn.users.concat(rtn.roles);
		for (let userRole of rtn)
		{
			userRole.original.roles=userRole.original.roles.map(roleMap.get.bind(roleMap));
			userRole.roles=userRole.original.roles.slice();
		}

		return rtn;
	};

	SMOD("UserRole",UserRole);

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);