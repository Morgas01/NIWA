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

		var replaceDirs=[
			[normalizePath(relativeTo.getAbsolutePath()),"."],
			[normalizePath(µ.dirname)+"/","/morgas/"],
			[normalizePath(gui.dirname)+"/","/morgas/gui/"]
		];

		var resouceMap=new Map();

		var parser=(new SC.dependencyParser()).addSources(files)
		.addModuleRegister(SC.morgasModuleRegister,µ.dirname).addModuleDependencies(SC.morgasModuleDependencies,µ.dirname)
		.addModuleRegister(SC.morgasGuiModuleRegister,gui.dirname).addModuleDependencies(SC.morgasGuiModuleDependencies,gui.dirname);

		var getFile=function(path)
		{
			if(resouceMap.has(path[0]))
			{
				path=path.slice();
				path[0]=resouceMap.get(path[0]);
			}
			return relativeTo.clone().changePath(path.join("/"));
		};

		var restService=function(param)
		{
			if(param.path.length==0||param.path[0]=="")
			{
				return parser.parse()
				.then(function(rtn)
				{
					rtn.providedModules={};
					for(let key in parser.moduleRegister) rtn.providedModules[key]=parser.moduleRegister[key].getAbsolutePath();
					rtn.providedDependencies={};
					for(let key in parser.moduleDependencies) rtn.providedDependencies[key]=parser.moduleDependencies[key];
					rtn.providedFileDependencies={};
					for(let key in parser.fileDependencies) rtn.providedFileDependencies[key]=parser.fileDependencies[key];
					return rtn;
				});
			}

			var file=getFile(param.path);

			return file.exists()
			.then(function()
			{
				if("raw" in param.query)  return file.read({encoding:"UTF-8"});

				return parser.parse()
				.then(function(result)
				{
					var resolver=new SC.DependencyResolver(result.fileDependencies);
					var files=resolver.resolve([morgasJsFile,normalizePath(file.getAbsolutePath())]);
					return Promise.all(files.map(f=>SC.File.stringToFile(f).read().then(data=>[f,data])))
					.then(function(fileContents)
					{
						var concat=new Concat(true,param.path.join("/"),"\n/********************/\n");
						for (var [name,data] of fileContents)
						{
							let replaced=false;
							for(let[filepath,replacement] of replaceDirs)
							{
								if(name.startsWith(filepath))
								{
									name=name.replace(filepath,replacement);
									replaced=true;
									break;
								}
							}
							if(!replaced)
							{
								for(let[replacement,filepath] of resouceMap)
								{
									if(name.startsWith(filepath))
									{
										name=name.replace(filepath,replacement);
										break;
									}
								}
							}
							name+="?raw";
							concat.add(name,data);
						}
						return concat.content+"\n//# sourceMappingURL=data:application/json;charset=utf-8;base64," + new Buffer(concat.sourceMap).toString("base64")
					});
				})
				//.then(files=>files.join("\n/********************/\n"));
			},()=>
			{
				param.status=404;
				return param.path+" NOT FOUND";
			});
		};

		let resourceCounter=0;
		restService.addResource=function(moduleRegister,moduleDependencies,directory,name)
		{
			if(!directory) throw "no directory";
			directory=SC.File.stringToFile(directory);
			if(moduleRegister) parser.addModuleRegister(moduleRegister,directory);
			parser.addModuleDependencies(moduleDependencies,directory);

			if(!name) name="resource_"+(resourceCounter++);
			if(resouceMap.has(name))
			{
				µ.logger.warn(`resource name "${name}" already in use`);
				name+="_"+(resourceCounter++);
			}
			resouceMap.set(name,normalizePath(directory.getAbsolutePath()));
		};
		return restService;
	}

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);