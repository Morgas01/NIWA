module.exports={
	list:function()
	{
		return worker.ask("NIWA","applist");
	}
};
