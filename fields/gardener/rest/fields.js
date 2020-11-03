module.exports={
	list()
	{
		return worker.askNeighbor("owner","getFieldList");
	}
};