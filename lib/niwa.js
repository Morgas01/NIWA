let µ=require("morgas");
let SC=Morgas.shortcut({
	path:require.bind(null,"path"),
	http:require.bind(null,"http"),
	url:require.bind(null,"url"),
	logger:require.bind(null,"./logger"),
	Field:require.bind(null,"./field"),
	fs:require.bind(null,"fs"),
	fillResponse:require.bind(null,"./fillResponse")
	//group:"group",
});

let Niwa=µ.Class({
	constructor:function({
		yard=SC.path.resolve(__dirname,".."), //working directory
		door, //port
		name,

		welcomeSign,
		//TODO rename
		logLevel,
		allowCommunication,
		allowAutoOpen
	}={})
	{
		//TODO needed? this._updateNeighbors=SC.group(this._updateNeighbors,1e3,5e3);
		this.yard=SC.path.resolve(yard||workDir);
		this.logger=µ.logger;//TODO LOGGER(this.yard,name);

		let config={};
		try
		{
			config=require(SC.path.resolve(this.yard,"config/server"))
		}
		catch(e)
		{
			this.logger.error({error:e},"could not load config");
		}
		this.door =					door!=null?door								:(config.door!=null?config.door								:0);
		this.name =					name!=null?name								:(config.name!=null?config.name								:Math.round(Math.random()*Niwa.DEFAULT_NAMES.length)%Niwa.DEFAULT_NAMES.length);
		this.logLevel =				logLevel!=null?logLevel						:(config.logLevel!=null?config.logLevel						:"INFO");
		this.welcomeSign =			welcomeSign!=null?welcomeSign				:(config.welcomeSign!=null?config.welcomeSign				:"gardener");
		this.allowCommunication =	allowCommunication!=null?allowCommunication	:(config.allowCommunication!=null?config.allowCommunication	:true);
		this.allowAutoOpen =		allowAutoOpen!=null?allowAutoOpen			:(config.allowAutoOpen!=null?config.allowAutoOpen			:true);

		let fieldsDir=SC.path.resolve(this.yard,"fields");
		try {
			let fieldPaths=SC.fs.readdirSync(fieldsDir)
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
			config.fields.push(...fieldPaths.map(f=>({path:f})));
		}
		catch(e)
		{
			this.logger.error({error:e},`failed to scan local fields`);
		}

		this.entrance=null; //server
		this.fields=config.fields?config.fields.map(f=>new SC.Field(f)):[];
		for (let field of this.fields)
		{
			field.addEventListener("workerState",this,this._updateNeighbors);
		}
	},
	open()
	{
		return this.placeGuidePost()
		.then(()=>
		{
			if(this.allowAutoOpen)
			{
				let toOpen = this.fields.filter(f=>f.autoOpen);
				this.logger.info("opening: "+toOpen.map(f=>f.name));
				return Promise.allSettled(toOpen.map(f=>f.open()));
			}
		})
		.then(()=>
		{
			this.logger.info("all fields settled");
		})
	},
	//TODO close()
	placeGuidePost(door=this.door)
	{
		this.logger.info(`placing guide post for door ${door}`);
		return new Promise((resolve,reject)=>
		{
			let server=SC.http.createServer(this._guideGuest.bind(this));
			server.listen(door,(error)=>
			{
				if(error)
				{
					this.logger.error({error},`failed place guide post at door ${door}`);
					reject(error);
				}
				else
				{
					this.entrance=server;
					this.door=server.address().port;
					this.logger.info(`guide post placed at door ${this.door}`);
					this.logger.info(`http://localhost:${this.door}`);
					resolve(server);
				}
			});
		});
	},
	_guideGuest(request,response)
	{
		this.logger.info({type:"access",url:request.url});

		let requestPath=SC.url.parse(request.url).pathname.replace(/^\//,"").split("/");
		if(requestPath[0]==="") requestPath.shift();

		if(requestPath.length==0)
		{
			//redirect welcomeSign
			let newUrl="http://"+request.headers['host']+"/"+this.welcomeSign;
			this.logger.info({type:"redirect",from:request.url,to:newUrl},`redirect ${request.url} to ${newUrl}`);
			SC.fillResponse(response,SC.http.STATUS_CODES[302]+ '. Redirecting to ' + newUrl,{
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
				return;
			}
			if(requestPath.length==1||requestPath[1]=="")
			{
				requestPath[1]="index.html";
			}
			let fieldPart=requestPath.slice(1);
			field.guideGuest(request,response,fieldPart);
		}
	},
	async _updateNeighbors(event)
	{
		if(this.entrance==null||event.state=="start") return;
		
		let fieldConfigs=(await Promise.allSettled(this.fields.map(field=>field.ready.then(config=>({field,config})))))
		.filter(r=>r.status==="fulfilled")
		.map(r=>r.value);
		for(let fieldConfig of fieldConfigs)
		{
			let field=fieldConfig.field;
			let neighborFieldConfigs=[];
			let allowCommunication= this.allowCommunication==null?field.allowCommunication:this.allowCommunication;
			switch (this.allowCommunication)
			{
				case false:
					break;
				case true:
					neighborFields=fieldConfigs.filter(f=>f!==fieldConfig);
					break;
				default:
					neighborFieldConfigs=field.communicationList.map(neighborName=>fieldConfigs.find(f=>f.config.name===neighborName))
					.filter(µ.constantFunctions.pass);//filter nulls
			}

			let neighbors=neighborFieldConfigs.map(neighborFieldConfig=>({
				field:neighborFieldConfig.field,
				name:neighborFieldConfig.config.name,
				type:neighborFieldConfig.config.type
			}));
			if(fieldConfig.config.type.includes("gardener"))
			{
				neighbors.unshift(this.getOwner());
			}
			field.setNeighbors(neighbors);
		}
	},
	getOwner()
	{
		return {
			name:"owner",
			type:["owner"],
			field: {
				helpNeighbor(method, args, timeout)
				{
					switch (method)
					{
						case "getFieldList":
							return;//TODO
						case "getNiwaConfig":
							return {
								name: this.name,
								logLevel: this.logLevel,
								welcomeSign: this.welcomeSign,
								allowCommunication: this.allowCommunication,
								allowAutoOpen: this.allowAutoOpen
							};
						case "setNiwaConfig":
							//TODO
							break;
						case "setFieldConfig":
							return;//TODO
						case "addField":
							return;//TODO
						case "openField":
							return;//TODO
						case "closeField":
							return;//TODO
						case "removeField":
							return;//TODO
						default:
							return promise.reject("unknown method");
					}
				}
			}
		}
	}
});
Niwa.DEFAULT_NAMES=["Mōtsū-ji","Kairaku-en","Rikugi-en","Hama-rikyū","Kenroku-en","Byōdō-in","Jisho-ji","Rokuon-ji","Ryōan-ji","Tenryū-ji","Murin-an","Kōraku-en","Shūraku-en","Ritsurin","Suizen-ji Jōju-en","Sengan-en","Shikina-en"]

module.exports=Niwa;
