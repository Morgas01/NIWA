(function(µ,SMOD,GMOD,HMOD,SC){

	var gui=require("MorgasGui");
	var Concat=require("concat-with-sourcemaps");

	SC=SC({
		dependencyParser:require.bind(null,"Morgas/dependencyParser"),
		morgasModuleRegister:"Morgas.ModuleRegister",
		morgasModuleDependencies:"Morgas.ModuleDependencies",
		morgasGuiModuleRegister:"Morgas.gui.ModuleRegister",
		morgasGuiModuleDependencies:"Morgas.gui.ModuleDependencies",
		DependencyResolver:"DepRes",
		File:"File"
	});

	var normalizePath=function(path){return path.replace(/\\/g,"/");};
	var morgasJsFile=normalizePath(new SC.File(µ.dirname).changePath("Morgas.js").getAbsolutePath());


	module.exports=function(files,relativeTo)
	{
		relativeTo=SC.File.stringToFile(relativeTo);

		var replaceDirs=[[normalizePath(µ.dirname)+"/","/morgas/"],[normalizePath(gui.dirname)+"/","/morgas/gui/"],[normalizePath(process.cwd())+"/","../../"]];

		var parser=(new SC.dependencyParser()).addSources(files)
		.addModuleRegister(SC.morgasModuleRegister,µ.dirname).addModuleDependencies(SC.morgasModuleDependencies,µ.dirname)
		.addModuleRegister(SC.morgasGuiModuleRegister,gui.dirname).addModuleDependencies(SC.morgasGuiModuleDependencies,gui.dirname);


		var restService=function(param)
		{
			if(param.path.length==0) return parser.parse();

			var file=relativeTo.clone();
			file.changePath.apply(file,param.path);
			return file.exists()
			.then(function()
			{
				return parser.parse()
				.then(function(result)
				{
					var resolver=new SC.DependencyResolver(result.fileDependencies);
					var files=resolver.resolve([morgasJsFile,normalizePath(file.getAbsolutePath())]);
					return Promise.all(files.map(f=>SC.File.stringToFile(f).read().then(data=>[f,data])))
					.then(function(fileContents)
					{
						var concat=new Concat(true,param.path.join("/"),"\n/********************/\n");
						for (var fileContent of fileContents)
						{
							var name=fileContent[0];
							var data=fileContent[1];
							replaceDirs.forEach(p=>name=String.prototype.replace.apply(name,p));
							concat.add(name,data);
						}
						return concat.content+"\n//# sourceMappingURL=data:application/json;charset=utf-8;base64," + new Buffer(concat.sourceMap).toString("base64")
					});
				})
				//.then(files=>files.join("\n/********************/\n"));
			},()=>param.status=404)
		};
		restService.dependencyParser=parser;
		return restService;
	}

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);