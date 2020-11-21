let µ=require("morgas");
let SC=Morgas.shortcut({
	path:require.bind(null,"path"),
	http:require.bind(null,"http"),
	url:require.bind(null,"url"),
	logger:require.bind(null,"./logger"),
	Field:require.bind(null,"./field"),
	fs:require.bind(null,"fs"),
	fillResponse:require.bind(null,"./fillResponse"),
	ServiceResult:require.bind(null,"../util/ServiceResult"),
	File:"File",
	util:"File/util"
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
				fieldPaths=fieldPaths.filter(fieldPath=>!config.fields.includes(f=>f.path===fieldPath))
			}
			config.fields.push(...fieldPaths.map(f=>({path:SC.path.relative(this.yard,f)})));
		}
		catch(e)
		{
			this.logger.error({error:e},`failed to scan local fields`);
		}

		this.entrance=null; //server
		this.fields=config.fields.map(f =>
		{
			f.shedBase=SC.path.resolve(this.yard,"shed");
			return new SC.Field(f);
		});
		for (let field of this.fields)
		{
			field.addEventListener("workerState",this,this._updateNeighbors);
		}
	},
	getConfig()
	{
		return {
			name: this.name,
			logLevel: this.logLevel,
			welcomeSign: this.welcomeSign,
			allowCommunication: this.allowCommunication,
			allowAutoOpen: this.allowAutoOpen,
			fields:this.fields.map(f=>
			{
				return {
					path:f.path,
					name:f.name,
					autoOpen:f.autoOpen,
					allowCommunicatio:f.allowCommunicatio,
					communicationList:f.communicationList,
				}
			})
		};
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
				return Promise.allSettled(toOpen.map(f=>f.open()))
				.then(results=>
				{
					this.logger.info("all fields settled");
					for(let i=0; i<results.length;i++)
					{
						let {status,reason}=results[i];
						if(status==="rejected")
						{
							let name=toOpen[i].name;
							this.logger.error(name,reason);
						}
					}
				})
			}
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
			SC.fillResponse(response,new SC.ServiceResult({
				data:SC.http.STATUS_CODES[302]+ '. Redirecting to ' + newUrl,
				headers:{'Location': newUrl},
				status:302
			}));
		}
		else
		{
			let fieldName=requestPath[0];
			let field=this.fields.find(f=>f.name===fieldName);
			if(!field)
			{
				SC.fillResponse(response,new SC.ServiceResult({status:501,data:`no such field "${fieldName}"`}));
				return;
			}
			if(requestPath.length==1)
			{
				//redirect field/index.html
				let newUrl="http://"+request.headers['host']+"/"+fieldName+"/index.html";
				this.logger.info({type:"redirect",from:request.url,to:newUrl},`redirect ${request.url} to ${newUrl}`);
				SC.fillResponse(response,new SC.ServiceResult({
					data:SC.http.STATUS_CODES[302]+ '. Redirecting to ' + newUrl,
					headers:{'Location': newUrl},
					status:302
				}));
			}
			else if (requestPath[1]=="")
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
	async addField({path,name,autoOpen,allowCommunicatio,communicationList})
	{
		let fieldParam = {
			path,
			name,
			autoOpen,
			allowCommunicatio,
			communicationList,
			shedBase:SC.path.resolve(this.yard, "shed")
		};
		this.fields.push(new SC.Field(fieldParam));
		return this.saveConfig();
	},
	async removeField(name)
	{
		let index = this.fields.findIndex(f => f.name === name);
		if(index!==-1)
		{
			let field=this.fields[index];
			if(field.state!=="close") field.close();
			this.fields.splice(index,1);
			await this.saveConfig();
			return true;
		}
		return false;
	},
	saveConfig()
	{
		let config = this.getConfig();
		return SC.util.enshureDir(SC.path.resolve(this.yard, "config"))
		.then(function ()
		{
			return this.changePath("server.json")
				.write(JSON.stringify(config, null, "\t"));
		});
	},
	async openField(name)
	{
		let field=this.fields.find(f => f.name === name);
		if(!field||field.state==="open") return false;
		return field.open();
	},
	async closeField(name)
	{
		let field=this.fields.find(f => f.name === name);
		if(!field||field.state==="close") return false;
		return field.close();
	},
	getOwner()
	{
		return {
			name:"owner",
			type:["owner"],
			field: {
				helpNeighbor:async (method, args, timeout)=>
				{
					switch (method)
					{
						case "getNiwaConfig":
							return this.getConfig();
						case "setNiwaConfig":
							//TODO
							break;
						case "getFieldList":
							return this.fields.map((field,index)=>({
								index,
								name:field.name,
								path:field.path,
								state:field.state,
								neighbors:field.neighbors.map(n=>n.name)
							}));
						case "setFieldConfig":
							return;//TODO
						case "addField":
						{
							let fieldJson = args;
							if (!fieldJson.name) return "no name";
							if (!fieldJson.path) return "no path";
							if (!await new SC.File(this.yard).changePath(fieldJson.path).exists().then(() => true, () => false))
							{
								return "path does not exist"
							}
							if (this.fields.findIndex(f => f.name === fieldJson.name) !== -1)
							{
								return "name already exists"
							}

							return this.addField({
								path: fieldJson.path,
								name: fieldJson.name,
								autoOpen: fieldJson.autoOpen,
								allowCommunicatio: fieldJson.allowCommunicatio,
								communicationList: fieldJson.communicationList,
							});
						}
						case "removeField":
						{
							let name = args;
							return this.removeField(name);
						}
						case "openField":
						{
							let name = args;
							return this.openField(name);
						}
						case "closeField":
						{
							let name = args;
							return this.closeField(name);
						}
						default:
							return promise.reject("unknown method");
					}
				}
			}
		}
	}
	//TODO destroy
});
Niwa.DEFAULT_NAMES=["Mōtsū-ji","Kairaku-en","Rikugi-en","Hama-rikyū","Kenroku-en","Byōdō-in","Jisho-ji","Rokuon-ji","Ryōan-ji","Tenryū-ji","Murin-an","Kōraku-en","Shūraku-en","Ritsurin","Suizen-ji Jōju-en","Sengan-en","Shikina-en"]

module.exports=Niwa;
