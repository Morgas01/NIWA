let types={
	".html":"text/html",
	".css":"text/css",
	".js":"application/javascript",
	".json":"application/json",
	".svg":"image/svg+xml",

	"default":"application/octet-stream"
};

module.exports={
	types:types,
	get:function(extension)
	{
		return types[extension]||types["default"];
	}
};
