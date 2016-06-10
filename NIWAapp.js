(function(µ,SMOD,GMOD,HMOD,SC){
	
	var WORKER=GMOD("nodeWorker");
	
	SC=SC({
		File:"File",
		Promise:"Promise"
	});
	
	var LOG=require("./logger");

	var URL=require("url");
	var querystring=require("querystring");
	
	var NIWAapp=µ.Class(WORKER,{
		init:function(name,path)
		{
			this.logger=LOG("main").child({app:name});
			this.folder=new SC.File(path);
			this.mega(new SC.File(__dirname).changePath("NIWAappWorker").filePath,{name:name},path);
			
			this.stateGuard=SC.Promise.open(this);
			
			this.addListener(".readyState",this,function(event)
			{
				switch(event.value.state)
				{
					case "running":
						this.logger.info("started");
						this.stateGuard.resolve(event.data);
						break;
					case "error":
						this.logger.error({error:event.error});
						this.stateGuard.reject(event.error);
						this.stateGuard=SC.Promise.reject(null,this);
						break;
				}
			});
			
		},
		rest:function(request,path)
		{
			return this.stateGuard.then(function()
			{
				return this.request("restCall",{
					path:path,
					query:querystring.parse(URL.parse(request.url).query),
					headers:request.headers,
					method:request.method
				});
			},
			function(error)
			{
				return Promise.reject({data:error,status:500})
			});
		}
	});
	module.exports=SMOD("NIWAapp",NIWAapp);
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);