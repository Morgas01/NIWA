(function(µ,SMOD,GMOD,HMOD,SC){

	request=GMOD("request");

	SC=SC({
		UserRole:"UserRole",
		TableConfig:"gui.TableConfig.Select",
		Table:"gui.Table",
		actionize:"gui.actionize",
		dlg:"gui.Dialog.Input",
		remove:"array.remove",
		getValues:"getInputValues",
		edit:"UserRoleEditDialog"
	});

	let userRoleTable=null;

	request.json("rest/user/config?token="+sessionStorage.getItem("NIWA_SESSION"))
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
		userRoleTable.add(userRoles.users.concat(userRoles.roles));
		document.body.appendChild(userRoleTable.getTable());

		let actionsContainer=document.querySelector("#actions");
		let addUserBtn=document.querySelector("[data-action=addUser");
		let setPasswordBtn=document.querySelector("[data-action=setPassword");
		let addRoleBtn=document.querySelector("[data-action=addRole");
		let editBtn=document.querySelector("[data-action=edit");
		let deleteBtn=document.querySelector("[data-action=delete");

        actionsContainer.disabled=addUserBtn.disabled=addRoleBtn.disabled=false;

        userRoleTable.getTable().addEventListener("change",function(event)
        {
        	let row=event.target.parentNode;
        	setPasswordBtn.disabled=row.dataset.type!==SC.UserRole.Types.USER;
        	editBtn.disabled=deleteBtn.disabled=false;
        });

		SC.actionize({
			"addUser":function()
			{
				actionsContainer.disabled=true;
            	new SC.edit(true,userRoles)
				.then(()=>reloadTable())
            	.always(function()
            	{
            		actionsContainer.disabled=false;
            	});
			},
            "setPassword":function()
            {
            	let selected=userRoleTable.getSelected()[0];
				actionsContainer.disabled=true;
            	new SC.dlg(`<input type="hidden" name="token" value="${sessionStorage.getItem('NIWA_SESSION')}"><input name="password" autofocus>`)
            	.always(function()
            	{
            		actionsContainer.disabled=false;
            	});
            },
            "addRole":function()
            {
				actionsContainer.disabled=true;
            	new SC.edit(false,userRoles)
				.then(()=>reloadTable())
            	.always(function()
            	{
            		actionsContainer.disabled=false;
            	});
            },
            "edit":function()
            {
				actionsContainer.disabled=true;
            	let selected=userRoleTable.getSelected()[0];
            	new SC.edit(selected,userRoles)
				.then(()=>reloadTable())
            	.always(function()
            	{
            		actionsContainer.disabled=false;
            	});
            },
            "delete":function()
            {
            	let selected=userRoleTable.getSelected()[0];
				actionsContainer.disabled=true;
            	request({
            		method:"DELETE",
            		url:"rest/user/config/"+selected.type.toLowerCase(),
            		data:JSON.stringify({
            			token:sessionStorage.getItem("NIWA_SESSION"),
            			name:selected.name
            		})
            	})
            	.catch(request.allowedStatuses([205]))
            	.then(function()
            	{
            		userRoleTable.remove(selected);
            		SC.remove(userRoles[selected.type.toLowerCase()+"s"],selected);
            	},
            	function(error)
            	{
            		µ.logger.error(error);
            		alert(error.response);
            	})
            	.then(()=>actionsContainer.disabled=false);
            }
		},actionsContainer);

		let reloadTable=function()
		{
			/*for(let entry of userRoleTable.data.slice())
			{
				userRoleTable.remove(entry);
			}*/
			userRoleTable.clear();
			request.json("rest/user/config?token="+sessionStorage.getItem("NIWA_SESSION"))
			.then(function(data)
			{
				userRoles=SC.UserRole.parse(data);
				userRoleTable.add(userRoles.users.concat(userRoles.roles));
			},
			function(error)
			{
				µ.logger.error(error);
				alert("error ocurred");
			});
		}
	},
	function(error)
	{
		switch(error.status)
		{
			case 400:
				alert("session expired");
				break;
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