(function(µ,SMOD,GMOD,HMOD,SC){

	let Table=GMOD("gui.Table");
	let Select=GMOD("gui.TableConfig.Select");
	let request=GMOD("request");
	
	SC=SC({
		AppEditDialog:"AppEditDialog",
		AbstractWorker:"AbstractWorker",
		actionize:"actionize"
	});

	let tableContainer=document.querySelector("#apps");
	let appTable=new Table(new Select([
		{name:"context",fn:(cell,data)=>cell.innerHTML=String.raw`<a href="/${data.context}" target="_top">/${data.context}</a>`},
		"name",
		"state",
		{name:"dependencies",getter:app=>app.dependencies?app.dependencies.join("\n"):""},
		"path"],
		{
			radioName:"app"
		}
	));
	tableContainer.appendChild(appTable.getTable());

	let reloadTable=function()
	{
		return request.json("rest/apps/list").then(function(data)
		{
			appTable.clear();
			appTable.add(data);
		},
		function()
		{
			µ.logger.error(error);
			alert("error ocurred");
			return Promise.reject();
		});
	};
	
	
	reloadTable()
	.then(function()
	{
		let actionsContainer=document.querySelector("#actions");
		let addBtn=document.querySelector("[data-action=add");
        let startBtn=document.querySelector("[data-action=start");
        let editBtn=document.querySelector("[data-action=edit");
        let stopBtn=document.querySelector("[data-action=stop");
        let deleteBtn=document.querySelector("[data-action=delete");

        actionsContainer.disabled=false;
        addBtn.disabled=false;

        appTable.getTable().addEventListener("change",function(event)
        {
        	let row=event.target.parentNode;
        	let appData=appTable.change(row);

        	startBtn.disabled=(appData.state!==SC.AbstractWorker.states.CLOSE);
        	stopBtn.disabled=(appData.state!==SC.AbstractWorker.states.OPEN);
        	editBtn.disabled=false;
        	deleteBtn.disabled=false;
        	deleteBtn.classList.toggle("warn",appData.state!==SC.AbstractWorker.states.CLOSE);

        	SC.actionize(actionsContainer,{
        		"add":function()
        		{
        		}
                "start":function()
                {
                }
                "edit":function()
                {
                	actionsContainer.disabled=true;
                	new SC.AppEditDialog()
                	.always(function()
                	{
        				actionsContainer.disabled=false;
                	})
                }
                "stop":function()
                {
                }
                "delete":function()
                {
                }
        	})
        });
	});

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
