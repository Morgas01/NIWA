let PATH=require("path");
let http=require("http");
let URL=require("url");

let LOGGER=require("./lib/logger");


let Niwa=function({
	yard=__dirname,
	doorway=0,
	name=Math.round(Math.random()*Niwa.DEFAULT_NAMES.length)%Niwa.DEFAULT_NAMES.length,

	workDir=yard,
	port=null,
	loggerName=name
}={})
{
	this.yard=PATH.resolve(yard||workDir);
	this.caretaker=new Caretaker(this);
	this.logger=LOGGER(this.yard,name||loggerName);
	//TODO config
	this.doorway=doorway;


	this.server=null; //entrance?
	this.fields=[];
};
Niwa.DEFAULT_NAMES=["Mōtsū-ji","Kairaku-en","Rikugi-en","Hama-rikyū","Kenroku-en","Byōdō-in","Jisho-ji","Rokuon-ji","Ryōan-ji","Tenryū-ji","Murin-an","Kōraku-en","Shūraku-en","Ritsurin","Suizen-ji Jōju-en","Sengan-en","Shikina-en"]
Object.assign(Niwa.prototype,{
	open()
	{
		this.placeGuidePost();
	},
	placeGuidePost(doorway=this.doorway)
	{
		this.logger.info(`placing guide post for doorway ${doorway}`);
		return new Promise((resolve,reject)=>
		{
			let server=http.createServer(this._guideGuest.bind(this));
			server.listen(doorway,function(e)
			{
				if(e)
				{
					this.logger.error({error:e},`failed place guide post at doorway ${doorway}`);
					reject(e);
				}
				else
				{
					this.server=server;
					this.doorway=server.address().port;
					logger.info(`guide post placed at doorway ${doorway}]`);
					resolve(server);
				}
			});
		});
	},
	_guideGuest(request,response)
	{
		this.logger.info({type:"access",url:request.url});
		if(request.url==="/")
		{//redirect
			//TODO config
		}
		else
		{
			let requestPath=URL.parse(request.url.slice(1)).pathname.split("/");
			let
			if(requestPath.length==1||requestPath[1]=="")
			{
				//TODO welcomePage
				let newUrl="http://"+request.headers['host']+"/"+requestPath[0]+"/index.html";
				this.logger.info({type:"redirect",from:request.url,to:newUrl},`redirect ${request.url} to ${newUrl}`);
				SC.fillResponse(response,http.STATUS_CODES[302]+ '. Redirecting to ' + newUrl,{
					'Location': newUrl
				},302);
			}
			else if(!this.caretaker.guide(requestPath[0],request,response,requestPath.slice(1)))
			{//unknown app
				SC.fillResponse(response,`no such app "${requestPath[0]}"`,null,501)
			}
		}
	}
});