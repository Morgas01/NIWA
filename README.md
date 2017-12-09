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

##rest services
Defining a means simply putting a .js file in the `./rest` directory in your application.
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
		- configManager
		- dependencyManager
		- ServiceResult
		- mimeTypes (irrelevant)
		
		
