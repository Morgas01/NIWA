(function(µ,SMOD,GMOD,HMOD,SC){

	request=GMOD("request");

	SC=SC({
		UserRole:"UserRole",
		TableConfig:"gui.TableConfig.Select",
		Table:"gui.Table"
	});

	let userRoleTable=null;

	request.json({
		url:"rest/user/config",
		data:JSON.stringify(sessionStorage.getItem("NIWA_SESSION"))
	})
	.then(function(data)
	{
		let userRoles=SC.UserRole.parse(data);
		userRoleTable=new SC.Table(new SC.TableConfig([
			{
				name:"name",
				fn:function(e,u)
				{
					e.textContent=u.name;
					e.parentNode.dataset.type=this.type;
					if(this.type===SC.UserRole.Types.ROLE)
					{
						e.draggable=true;
					}
				}
			},
			{
				name:"roles",
				styleClass:"roles",
				fn:(e,u)=>e.textContent=u.roles.join(", ")
			},
			{
				name:"permissions",
				fn:(e,u)=>e.textContent=u.permissions.join(", ")
			},
			{
				name:"effective permissions",
				fn:(e,u)=>e.textContent=u.effectivePermissions().join(", ")
			}
		],{radioName:"userRoles"}));
		userRoleTable.add(userRoles);
		document.body.appendChild(userRoleTable.getTable());
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