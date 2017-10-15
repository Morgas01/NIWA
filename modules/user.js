(function(µ,SMOD,GMOD,HMOD,SC){

	let File=GMOD("File");

	SC=SC({
		Session:require.bind(null,"./session"),
		Permissions:require.bind(null,"./permissions"),
		util:"File.util",
		ServiceResult:require.bind(null,"../util/ServiceResult")
	});

	let userFile=new File(__dirname).changePath("../config/users.json");

	let checkUser=async function(sessionToken)
	{
		let session=await SC.Session.get(sessionToken);
		if(session.user==null) throw new SC.ServiceResult({data:"not logged in",status:400});
		return session;
	};
	let checkNoUser=async function(sessionToken)
	{
		let session=await SC.Session.get(sessionToken);
		if(session.user!=null) throw new SC.ServiceResult({data:"logged in",status:400});
		return session;
	};

	module.exports={
		logIn:function(sessionToken,username,password="")
		{
			return checkNoUser(sessionToken)
			.then(function(session)
			{
				return userFile.exists()
				.then(userFile.read)
				.then(JSON.parse)
				.then(async function(users)
				{
					if (users[username]==password)
					{
						session.user={
							name:username,
							permissions:await SC.Permissions.get(username)
						};
					}
					else throw new SC.ServiceResult({data:session.token,status:401});
				});
			});
		},
		logOut:function(sessionToken)
		{
			return checkUser(sessionToken)
			.then(function(session)
			{
				session.user=null;
			});
		},
		register:function(sessionToken,username,password="")
		{
			if(!username) return Promise.reject(new SC.ServiceResult({data:"no username",status:400}));

			return checkUser(sessionToken)
			.then(SC.Permissions.check(sessionToken,["registerUser"]))
			.then(()=>userFile.exists())
			.then(function()
			{
				return userFile.read()
				.then(JSON.parse);
			},
			function()
			{
				return SC.util.enshureDir(userFile.clone().changePath(".."))
				.then(function()
				{
					return {};
				});
			})
			.then(function(users)
			{
				if(!(username in users))
				{
					users[username]=password||"";
					return userFile.write(JSON.stringify(users));
				}
			})
			.then(function()
			{
				return SC.Permissions.addUsers(sessionToken,[{name:username}]);
			})
			//hide return value
			.then(µ.constantFunctions.n);

		},
		delete:function(sessionToken,username)
		{
			return SC.Permissions.check(sessionToken,["deleteUser"])
			.then(()=>userFile.exists())
			.then(()=>
			{
				return userFile.read()
				.then(JSON.parse)
				.then(function(users)
				{
					if(users[username])
					{
						delete users[username];
						return userFile.write(JSON.stringify(users))
						.then(()=>SC.Permissions.deleteUsers(sessionToken,[username]))
						.then(µ.constantFunctions.n);
					}
				});
			},
			µ.constantFunctions.n);
		}
	};

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
