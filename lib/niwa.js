let µ=require("morgas");
let SC=Morgas.shortcut({
	path:require.bind(null,"path"),
	http:require.bind(null,"http"),
	url:require.bind(null,"url"),
	logger:require.bind(null,"./logger"),
	Field:require.bind(null,"./field"),
	fs:require.bind(null,"fs"),
});

let Niwa=µ.class({
	constructor:function({
		yard=__dirname, //working directory
		door, //port
		name,

		welcomeSign,
		//TODO rename
		logLevel,
		allowCommunication,
		autoStart
	}={})
	{
		this.yard=PATH.resolve(yard||workDir);

		let config={};
		try
		{
			config=require(PATH.resolve(this.yard,"config/server"))
		}
		catch(e)
		{
			µ.logger.error({error:e},"could not load config");
		}
		this.door =					door!=null?door								:(config.door!=null?config.door								:0);
		this.name =					name!=null?name								:(config.name!=null?config.name								:Math.round(Math.random()*Niwa.DEFAULT_NAMES.length)%Niwa.DEFAULT_NAMES.length);
		this.logLevel =				logLevel!=null?logLevel						:(config.logLevel!=null?config.logLevel						:"INFO");
		this.welcomeSign =			welcomeSign!=null?welcomeSign				:(config.welcomeSign!=null?config.welcomeSign				:"gardener");
		this.allowCommunication =	allowCommunication!=null?allowCommunication	:(config.allowCommunication!=null?config.allowCommunication	:true);
		this.allowAutoStart =		allowAutoStart!=null?allowAutoStart			:(config.allowAutoStart!=null?config.allowAutoStart			:true);

		this.logger=LOGGER(this.yard,name);

		//TODO rename apps to fields
		let fieldsDir=SC.path.resolve(this.yard,"apps");
		try {
			let fieldPaths=SC.fs.readDirSync(fieldsDir)
			.map(f=>SC.path.resolve(fieldsDir,f))
			.filter(f=>SC.fs.statSync(f).isDirectory());
			if(!config.fields)
			{
				config.fields=[];
			}
			else
			{
				fieldPaths=fields.filter(fieldPath=>!config.files.includes(f=>f.path===fieldPath))
			}
			config.fields.push(...fieldPaths.map(f=>{path:f})));
		}
		catch(e)
		{
			this.logger.error({error:e},`failed to scan local fields`);
		}

		this.entrance=null; //server
		this.fields=config.fields?config.fields.map(f=>new SC.Field(f)):[];
	},
	open()
	{
		return this.placeGuidePost()
		.then(()=>
		{
			if(this.allowAutoStart)
			{
				return Promise.all(
					this.fields.filter(f=>f.autoStart)
					.map(f=>f.open().catch(µ.constantFunctions.pass))
				)
			}
		})
		.then(()=>
		{
			//TODO send apps ready?
		})
	},
	placeGuidePost(door=this.door)
	{
		this.logger.info(`placing guide post for door ${door}`);
		return new Promise((resolve,reject)=>
		{
			let server=http.createServer(this._guideGuest.bind(this));
			server.listen(door,function(e)
			{
				if(e)
				{
					this.logger.error({error:e},`failed place guide post at door ${door}`);
					reject(e);
				}
				else
				{
					this.entrance=server;
					this.door=server.address().port;
					logger.info(`guide post placed at door ${door}]`);
					resolve(server);
				}
			});
		});
	},
	_guideGuest(request,response)
	{
		this.logger.info({type:"access",url:request.url});

		let requestPath=URL.parse(request.url).pathname.split("/");
		if(requestPath[0]==="") requestPath.shift();

		if(requestPath.length=0)
		{
			//redirect welcomeSign
			let newUrl="http://"+request.headers['host']+"/"+this.welcomeSign;
			this.logger.info({type:"redirect",from:request.url,to:newUrl},`redirect ${request.url} to ${newUrl}`);
			SC.fillResponse(response,http.STATUS_CODES[302]+ '. Redirecting to ' + newUrl,{
				'Location': newUrl
			},302);
		}
		else
		{
			let fieldName=requestPath[0];
			let field=this.fields.find(f=>f.name===fieldName);
			if(!field)
			{
				SC.fillResponse(response,`no such field "${fieldName}"`,null,501);
			}
			if(requestPath.length==1||requestPath[1]=="")
			{
				requestPath[1]="index.html";
			}
			let fieldPart=requestPath.slice(1);
			field.guideGuest(request,response,fieldPart);
		}
	}
});
Niwa.DEFAULT_NAMES=["Mōtsū-ji","Kairaku-en","Rikugi-en","Hama-rikyū","Kenroku-en","Byōdō-in","Jisho-ji","Rokuon-ji","Ryōan-ji","Tenryū-ji","Murin-an","Kōraku-en","Shūraku-en","Ritsurin","Suizen-ji Jōju-en","Sengan-en","Shikina-en"]

module.exports=Niwa;
