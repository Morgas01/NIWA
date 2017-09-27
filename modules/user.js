(function(µ,SMOD,GMOD,HMOD,SC){

	let Session=require("./session");
	let Permissions=require("./permissions");

	let File=GMOD("File");

	SC=SC({
		util:"File.util",
	});

	let userFile=new File(__dirname).changePath("../config/users.json");

	module.exports={
		logIn:function(sessionToken,username,password="")
		{
			let session=Session.get(sessionToken);
			if(session==null) return Promise.reject("no session");
			if(session.user!=null) return Promise.reject("logged in");
			return userFile.exists()
			.then(userFile.read)
			.then(JSON.parse)
			.then(function(users)
			{
				if (users[username]==password)
				{
					session.user={
						name:username,
						permissions:Permissions.get(username)
					};
				}
				else return promise.reject(false);
			});
		},
		logOut:function(sessionToken)
		{
			let session=Session.get(sessionToken);
			if(session==null) return Promise.reject("no session");
			session.user=null;
		},
		register:function(sessionToken,username,password="")
		{
			if(!username) return Promise.reject("no username");
			let session=Session.get(sessionToken);
			if(session==null) return Promise.reject("no session");
			if(session.user==null) return Promise.reject("not logged in")
			if(!session.user.permissions.has("registerUser")) return Promise.reject("no permission");

			return userFile.exists()
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
			//hide return value
			.then(µ.constantFunctions.n);

		},
		delete:function(sessionToken,username)
		{
			let session=Session.get(sessionToken);
			if(session==null) return null;
			if(session.user==null) return Promise.reject("not logged in")
			if(!session.user.permissions.has("deleteUser")) return Promise.reject("no permission");

			return userFile.exists()
			.then(function()
			{
				return userFile.read()
				.then(JSON.parse)
				.then(function(users)
				{
					if(delete users[username])
					{
						return userFile.write(JSON.stringify(users))
						.then(µ.constantFunctions.n);
					}
				});
			},
			µ.constantFunctions.n);
		}
	};

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
