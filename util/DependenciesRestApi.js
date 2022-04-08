(function(µ,SMOD,GMOD,HMOD,SC){

	SC=SC({
		DependencyResolver:"DepRes",
		File:"File"
	});

	module.exports = function DependenciesRestApi(dependencyManager)
	{
		let api=async function({path,fullPath})
		{
			if(path.length==1 && path[0]==="allDependencies")
			{
				return api.allDependencies();
			}
			else if (path[0]==="get")
			{
				return api.get(path.slice(1))
			}
			let url=path.join("/");
			let allDependencies=await dependencyManager.getAllDependencies();
			if(url in allDependencies.urlDependencies)
			{
				let resolver=new SC.DependencyResolver(allDependencies.urlDependencies);
				let urls=resolver.resolve(url);
				//TODO return import script;
				let restPath=fullPath.slice(0,fullPath.length-path.length).join("/");
				return urls.map(f=>`document.write('<script type="text/javascript" defer="defer" src="rest/${restPath}/get/${f}"></script>')`).join("\n");
			}
			else
			{
				return new SC.ServiceResult({data:`alert("file '${url}' not found")`,headers:{"Content-Type":"application/javascript; charset=utf-8"}});
			}
		};
		api.get=async function(path)
		{
			let url=path.join("/");
			let allDependencies=await dependencyManager.getAllDependencies();
			if(url in allDependencies.urlToPath)
			{
				return new SC.File(dependencyManager.sourcesBasePath).changePath(allDependencies.urlToPath[url]);
			}
			else
			{
				return new SC.ServiceResult({data:`alert("file '${url}' not found")`,headers:{"Content-Type":"application/javascript; charset=utf-8"}});
			}
		};
		api.allDependencies=function ()
		{
			return dependencyManager.getAllDependencies();
		}
		return api;
	};

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);