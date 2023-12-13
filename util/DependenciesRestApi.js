(function(µ,SMOD,GMOD,HMOD,SC){

	SC=SC({
		DependencyResolver:"DepRes",
		ServiceResult:"ServiceResult",
		File:"File"
	});
	let urlsToLoaderScript=function({urls,path,fullPath})
	{
		let restPath=fullPath.slice(0,fullPath.length-path.length).join("/");
		let loaderScript=urls.map(f=>`document.write('<script type="text/javascript" defer="defer" src="rest/${restPath}/get/${f}"></script>')`).join("\n");
		return new SC.ServiceResult({data:loaderScript,headers:{"Content-Type":"application/javascript; charset=utf-8"}})
	}

	module.exports = function DependenciesRestApi(dependencyManager)
	{
		let api=async function({path,fullPath})
		{
			if(path[0] in api)
			{
				return api[path[0]]({path:path.slice(1),fullPath});
			}
			let url=path.join("/");
			let allDependencies=await dependencyManager.getAllDependencies();
			if(url in allDependencies.urlDependencies)
			{
				//TODO use DependencyManager.resolve() ?
				let resolver=new SC.DependencyResolver(allDependencies.urlDependencies);
				let urls=resolver.resolve(url);
				return urlsToLoaderScript({urls,path,fullPath});
			}
			else
			{
				return new SC.ServiceResult({data:`alert("file '${url}' not found")`,headers:{"Content-Type":"application/javascript; charset=utf-8"}});
			}
		};
		api.get=async function({path}={})
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
		};
		api.getFull=async function({path,fullPath})
		{
			let correctedFullPath=fullPath.slice();
			correctedFullPath.splice(fullPath.length-path.length-1,1);
			return urlsToLoaderScript({urls:(await dependencyManager.resolveAll()).urls,path,fullPath:correctedFullPath});
		}
		return api;
	};

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);