# NIWA
NIWA intertwined web applications

NIWA is an application server for simple NodeJs apps that can communicate with each other.

##Usage

* maual
	* git clone or download
	* `npm update` or `npm install`
	* npm run start
* cli
	```
		npm install -g niwa
		niwa <work directory> <port>
	```
* api
	```js
		let starter=require("niwa"); // function(niwaWorkDir=__dirname,overridePort=null)
		starter();
	```
	
#Work directory
If no directory is provided the install directory is used.
Config, Logs and application data is stored in this directory.

##structure
```
.
├─ config
   ├─ server.json
   ├─ apps.json
   ├─ users.json
   ├─ permissions.json
   └─ <appName>.config.json
├─ apps
   └─ ...
├─ logs
   └─ ...
└─ <work> // applications should persist files under a directory with its own name
```
You can use an empty directory as a work directory.
In order to start without providing a port you need a `config/server.json`.

###config/server.json
```json
{
	"port":8081,
	"logLevel":"INFO",			// default logger level
	"allowCommunication":true,	// default for communications
	"autoStart":false			// default to start app on server start
}
```

#Apps
An Application is a directory full of static assets with few exceptions.
Each app is deployed in a separate NodeJs process.
To deploy an app you can place it in a directory under `apps` or define it in the `config/apps.json` (or both).

##config/apps.json
```json
{
	"<name>":{
		"path":"<relative from apps or absolute>",
		//overwrite defaults
		"autoStart":boolean,
		"logLevel":"<level>" // bunyan log levels
	}
}
```

##styles 
`*.less` files are automatically compiled when they are requested with a url containing `/css/` instead of `/less/`.

e.g.: `app/some/css/path/styles.less`=>`app/some/less/path/styles.less //compiled`

##rest services
Defining a rest service means simply putting a `<name>.js` file in the `app/rest` directory in your application.
Those files are loaded when the application gets deployed.
Such a file can export a function or a object structure of functions. Each context of the requested url is matched to a key in that structure until a function is found.
The first context matches to the filename (without the extension). The remainder of the path as an array is also provided as the second argument of the function.
```js
module.exports=function({method,headers,query,data,path},path=[])
{
	return "hello world";
}
```

A function may return any serializable (`JSON.stringify`) value or an instance of `ServiceResult`.

###context notes
- `process.cwd() // application directory`
- `"morgas"` package is already required
	- `niwa/util` is added as resource folder
		- ServiceResult
		- configManager
		- dependencyManager
		- mimeTypes (irrelevant)
		
		
#####util/ServiceResult
A small class for rest responses.

```js
let ServiceResult=µ.getModule("ServiceResult");
return new ServiceResult({status:403,data:"Please log in first"});
````



#####util/configManager
Creates a rest api for a persistent config.
The config is saved under `<work directory>/config/<app context>.json` with file rotation of 3.

**Parameter** `Morgas.Config` or a config description (see `Morgas.Config.parse`)

**returns**
```
api=function(param) // rest api
api.ready //Promise that is resolves to Morgas.Conig instance
api.addChangeListener=function(path,fn)
api.removeChangeListener=function(pathOfFn,fn)
api.notify=function(path, oldValue, newValue) // triggers changeListeners
api.save=function() // returns Promise
```


example service
```js
module.exports=µ.getModule("configManager")({
	name:"string",
	range:{
		type:number,
		default:3,
		min:0,
		max:10,
		step:0.5
	},
	check:{
		type:"boolean
	},
	list:{
		type:"array",
		model:"string"
	}
});
```
#####dependencyManager
Creates a rest api to serve js files with all needed dependencies.
It uses `morgas/lib/dependencyParser` to parse files

**Parameter** Array of file or directory paths and a base path from which navigation begins

**returns**
```
api=function(param) // rest api
api.addResource=function(moduleRegister,moduleDependencies,directory,name=null)
```
Morgas and MorgasGui resouces are already registered

example service
```js
module.exports=µ.getModule("dependencyManager")(["js"],"js");

```