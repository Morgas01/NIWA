require("Morgas");
(function(µ,SMOD,GMOD,HMOD,SC){
	SC=SC({
		parse:"ProcessArgs",
		adopt:"adopt"
	});

	var logger=require("./logger")("main");

	var config=module.exports=SC.parse({
		port:{
			names:["port","/p"],
			type:"number",
			value:8081,
		},
		appDir:{
			names:["appDir","/d"],
			value:"apps",
		},
		apps:{
			type:"json",
			names:["apps", "/a"],
			value:null
		}
	});
	logger.info({config:config},"config");

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
