(function(µ,SMOD,GMOD,HMOD,SC){

	let Table=GMOD("gui.Table");
	let Select=GMOD("gui.TableConfig.Select");
	let request=GMOD("request");
	
	SC=SC({
		AppEditDialog:"AppEditDialog",
		AbstractWorker:"AbstractWorker",
		actionize:"gui.actionize",
		Idlg:"gui.InputDialog"
	});

	let actionsContainer=document.querySelector("#actions");
	let addBtn=document.querySelector("[data-action=add");
	let startBtn=document.querySelector("[data-action=start");
	let editBtn=document.querySelector("[data-action=edit");
	let stopBtn=document.querySelector("[data-action=stop");
	let removeBtn=document.querySelector("[data-action=remove");

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
			startBtn.disabled=true;
            editBtn.disabled=true;
            stopBtn.disabled=true;
            removeBtn.disabled=true;
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

        actionsContainer.disabled=false;
        addBtn.disabled=false;

        appTable.getTable().addEventListener("change",function(event)
        {
        	let row=event.target.parentNode;
        	let appData=appTable.change(row);

        	startBtn.disabled=(appData.state!==SC.AbstractWorker.states.CLOSE);
        	stopBtn.disabled=(appData.state!==SC.AbstractWorker.states.OPEN);
        	editBtn.disabled=false;
        	removeBtn.disabled=false;
        	removeBtn.classList.toggle("warn",appData.state!==SC.AbstractWorker.states.CLOSE);
        });

		SC.actionize({
			"add":function()
			{
				actionsContainer.disabled=true;
				new SC.Idlg(`
<table>
	<tr>
		<td>Context</td>
		<td><input type="text" required name="context" autofocus></td>
	</tr>
	<tr>
		<td>Path</td>
		<td><input type="text" required name="path"></td>
	</tr>
</table>
<div class="errorMessage"></div>`
				,{
					modal:true,
					actions:{
						OK:function(values)
						{
							this.content.disabled=true;
							return request({
								url:"rest/apps/add",
								data:JSON.stringify(values),
							})
							.catch(error=>
							{
								µ.logger.error(error);
								this.content.disabled=false;
								this.content.querySelector(".errorMessage").textContent=error.response;
								return Promise.reject();
							});
						}
					}
				})
				.then(reloadTable)
				.always(()=>actionsContainer.disabled=false);
			},
			"start":function()
			{
				actionsContainer.disabled=true;
				let app=appTable.getSelected()[0];
				return request({
					url:"rest/apps/start",
					data:JSON.stringify({context:app.context}),
				})
				.then(reloadTable,
				function(error)
				{
					µ.logger.error(error);
					alert("error occurred");
				})
				.always(()=>actionsContainer.disabled=false);;
			},
			"edit":function()
			{
				actionsContainer.disabled=true;
				let app=appTable.getSelected()[0];
				new SC.AppEditDialog(app,appTable.data)
				.then(reloadTable)
				.always(function()
				{
					actionsContainer.disabled=false;
				});
			},
			"stop":function()
			{
				actionsContainer.disabled=true;
				let app=appTable.getSelected()[0];
				return request({
					url:"rest/apps/stop",
					data:JSON.stringify({context:app.context}),
				})
				.then(reloadTable,
				function(error)
				{
					µ.logger.error(error);
					alert("error occurred");
				})
				.always(()=>actionsContainer.disabled=false);;
			},
			"remove":function()
			{
				actionsContainer.disabled=true;
				let app=appTable.getSelected()[0];
				return request({
					url:"rest/apps/remove",
					data:JSON.stringify({context:app.context}),
				})
				.then(reloadTable,
				function(error)
				{
					µ.logger.error(error);
					alert("error occurred");
				})
				.always(()=>actionsContainer.disabled=false);;
			}
		},actionsContainer);
	});

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
