(function(µ,SMOD,GMOD,HMOD,SC){

	request=GMOD("request");

	SC=SC({
		TableConfig:"gui.TableConfig.Select",
	});

	request.json({
		url:"rest/user/list",
		data:JSON.stringify(sessionStorage.getItem("NIWA_SESSION"))
	})
	.then(function(data)
	{
		let config=new SC.TableConfig([{name:"name",fn:(e,n)=>e.textContent=n}],{radioName:"users"});
		let table=config.getTable(data);
		document.body.appendChild(table);
	},
	function(error)
	{
		switch(error.status)
		{
			case 401:
				alert("not logged in");
				break;
			case 403:
				alert("no permission");
				break;
			default :
				µ.logger.error(error);
				alert("error ocurred");
				return;
		}
		let retry=document.createElement("a");
		retry.href="users.html";
		retry.textContent="retry";
		document.body.appendChild(retry);
	})

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);