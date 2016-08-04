(function(µ,SMOD,GMOD,HMOD,SC){

	var TableData=GMOD("gui.TableData");
	var selectionTable=GMOD("gui.selectionTable");
	var request=GMOD("request");

	var tableContainer=document.querySelector("#apps");
	var appTable=null;
	var refreshTable=function()
	{
		request.json("rest/app/list").then(function(data)
		{
			if(appTable) appTable.remove();
			appTable=selectionTable(new TableData(data,[
				{name:"name",fn:(cell,data)=>cell.innerHTML=String.raw`<a href="/${data.name}" target="_top">${data.name}</a>`},
				{name:"ID",getter:app=>app.id},
				"state",
				{name:"dependencies",getter:app=>app.dependencies?app.dependencies.join("\n"):""}
				,"path"]));
			tableContainer.appendChild(appTable);
		},
		function()
		{
			//TODO
			console.error(arguments);
		});
	};
	refreshTable();

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
