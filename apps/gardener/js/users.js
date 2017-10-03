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
		let config=new SC.TableConfig(["name"],{radioName:"users"});
		let table=config.getTable(data);
		document.body.appendChild(table);
	},
	function(error)
	{
		if(error.status===401)
		{
			alert("not logged in");
			let retry=document.createElement("a");
			retry.href=".";
			retry.textContent="retry";
			document.body.appendChild(retry);
			return;
		}
		µ.logger.error(error);
		alert("error ocurred");
	})

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);