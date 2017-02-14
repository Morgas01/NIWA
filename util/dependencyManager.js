(function(µ,SMOD,GMOD,HMOD,SC){

	var gui=require("MorgasGui");

	SC=SC({
		dependencyParser:require.bind(null,"Morgas/dependencyParser"),
		morgasModuleRegister:"Morgas.ModuleRegister",
		morgasModuleDependencies:"Morgas.ModuleDependencies",
		morgasGuiModuleRegister:"Morgas.gui.ModuleRegister",
		morgasGuiModuleDependencies:"Morgas.gui.ModuleDependencies",
		DependencyResolver:"DepRes",
		File:"File"
	});

	var morgasJsFile=new SC.File(µ.dirname).changePath("Morgas.js").getAbsolutePath().replace(/\\/g,"/");

	module.exports=function(files,relativeTo)
	{
		var resolver=new SC.DependencyResolver();
		relativeTo=SC.File.stringToFile(relativeTo);

		(new SC.dependencyParser()).addSources(files)
		.addModuleRegister(SC.morgasModuleRegister,µ.dirname).addModuleDependencies(SC.morgasModuleDependencies,µ.dirname)
		.addModuleRegister(SC.morgasGuiModuleRegister,gui.dirname).addModuleDependencies(SC.morgasGuiModuleDependencies,gui.dirname)
		.parse()
		.then(function(result)
		{
			resolver.addConfig(result.fileDependencies);
		})
		.catch(µ.logger.error);

		return function(param)
		{
			var file=relativeTo.clone();
			file.changePath.apply(file,param.path);
			return file.exists()
			.then(function()
			{
				var files=resolver.resolve([morgasJsFile,file.getAbsolutePath().replace(/\\/g,"/")]);
				console.log(file.getAbsolutePath().replace(/\\/g,"/"),files)
				return Promise.all(files.map(f=>SC.File.stringToFile(f).read()))
				.then(files=>files.join("/********************/"));
			},()=>param.status=404)

		}
	}

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);