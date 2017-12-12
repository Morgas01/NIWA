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
Each app is deployed in a separate NodeJs process (using Morgas `nodeWorker`).
To deploy an app you can place it in a directory under `apps` or define it in the `config/apps.json` (or both).

##config/apps.json
```json
{
	"<name>":{
		"path":"<relative from apps or absolute>",
		//overwrite defaults
		"autoStart":boolean,
		"logLevel":"<level>", // bunyan log levels
		"communication": boolean || {
			"<name>":boolean || ["<context>"]
		}
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
- running as a Morgas worker
- `process.cwd() // application directory`
- `niwa/util` is added as resource folder
	- ServiceResult
	- configManager
	- dependencyManager
	- mimeTypes (irrelevant)
- [global `worker` extensions](#global-worker-extensions)
		
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


Example service
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

Example service
```js
module.exports=µ.getModule("dependencyManager")(["js"],"js");
```

####global `worker` extensions
```js
worker.eventSource=function(name,getter) returns trigger function(eventName,data) for server send events
worker.module=function(moduleName,methodName,args=[]) // call module
worker.getCommunicationList=function(name) // returns a Promise resolving to an array of contexts
{
	return worker.ask("NIWA","communicationList",{name:name});
};
worker.ask=function(context,method,data) // communicate with (call methods from) other applications 
worker.serverStarted=function() // overwrite for callback when server is started and communication is possible
```

###package.json
Having a `package.json` for an application is optional. But it is needed for communication and additional configuration.

#####application name
The name of the application is defined in `niwa.name` or `name` of its `package.json`

####setup script
If you define a `niwa.setup` the script gets called (required) when starting the application.
It is possible to export a Promise for asynchronous setups.

The script is called before any rest service is loaded.

#####dependencies
You can define application dependencies in the `niwa.dependencies` array.
Currently this is only a treated as a hint and is therefore optional.

##Communication
Applications with a [name](#application-name) can communicate with each other. 
It has to be allowed in the [apps.json](#config-apps.json).

#####Example
app1
```js
worker.myMethod=function(data,context)
{
	if(context=="someContext) return Promise.reject();
	return "value";
};
```
app2
```js
worker.getCommunicationList("app1")
.then(function(list)
{
	if(list.length==0) return Promise.reject();
	
	return worker.ask(list[0],"myMethod")
	.then(function(data)
	{
		//handle answer
	});
}
```


#Modules
Modules are extensions that can be called from applications.

##session
Session object
```json
{
	"token":"token",
	"user":{
		"name":"name"
	}
}
```
Guest users have always an empty string as name 

####methods
-	create()	=>	Session object
-	get(token)	=>	Session object
-	getOrCreate(token)	=>	Session object
-	delete(token)	=>	boolean
-	refresh(token)	=>	boolean // mostly internal


##user
####methods
-	logIn(sessionToken,username,password="")	=>	void (reject value is a [ServiceResult](#util-ServiceResult))
-	logOut(sessionToken)	=>	void (reject value is a [ServiceResult](#util-ServiceResult))
-	register(sessionToken,username,password) => void (permission `"registerUser"` needed)
-	delete(sessionToken,username) => void (permission `"deleteUser"` needed)
-	list(sessionToken) => void (permission `"readPermissions"` needed)


##permissions
####methods
-	check(sessionToken,toCheck=[])	=>	void (reject value is a [ServiceResult](#util-ServiceResult))
-	checkAll(sessionToken,toCheck=[])	=>	Boolean[] (reject value is a [ServiceResult](#util-ServiceResult))
-	getAll(sessionToken) => void (permission `"readPermissions"` needed)
-	addUser(sessionToken,name) => void (permission `"addUser"` needed)
-	setUser(sessionToken,name,roles,permissions) => void (permission `"setUser"` needed)
-	deleteUser(sessionToken,username) => void (permission `"deleteUser"` needed)
-	addRole(sessionToken,name) => void (permission `"addRole"` needed)
-	setRole(sessionToken,name,roles,permissions) => void (permission `"setRole"` needed)
-	deleteRole(sessionToken,name) => void (permission `"deleteRole"` needed)


#Server send events
[EventSources](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) can be accessed via `<app context>/event/<event name>`.
Ordinary get requests are also supported.
###usage
- app
	1.	`let notify=worker.eventSource("myEvent",()=>"init value");`
	2.	`notify("update",value);`
- client
	1.	`let source=new EventSource("event/myEvent");`
	2.	`source.addEventListener("init",event=>alert(event.data));`
	2.	`source.addEventListener("update",event=>alert(event.data));`

#Special paths
`host:port/morgas/*` serves Morgas files
`host:port/morgas/gui/*` serves MorgasGui files
`host:port/morgas/gui/css/theme/<theme name>` serves MorgasGui compiled theme style
`host:port/morgas/gui/css/<module name>[/<theme name>]` serves MorgasGui compiled module styles