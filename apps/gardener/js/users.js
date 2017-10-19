(function(µ,SMOD,GMOD,HMOD,SC){

	request=GMOD("request");

	SC=SC({
		UserRole:"UserRole",
		TableConfig:"gui.TableConfig.Select",
		Table:"gui.Table",
		actionize:"gui.actionize",
		dlg:"gui.dialog",
		flatten:"flatten",
		getValues:"getInputValues",
	});

	let sort=new Intl.Collator(navigator.languages,{sensitivity:"base"}).compare
	let userRoleTable=null;

	request.json("rest/user/config?session="+sessionStorage.getItem("NIWA_SESSION"))
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
            	showEditDialog(true);
			},
            "setPassword":function()
            {
            },
            "addRole":function()
            {
            	showEditDialog(false);
            },
            "edit":function()
            {
            	let selected=userRoleTable.getSelected()[0];
            	showEditDialog(selected);
            },
            "delete":function()
            {
            	let selected=userRoleTable.getSelected()[0];
				actionsContainer.disabled=true;
            	request({
            		method:"DELETE",
            		url:"rest/user/config/"+selected.type.toLowerCase(),
            		data:JSON.stringify({
            			session:sessionStorage.getItem("NIWA_SESSION"),
            			name:selected.name
            		})
            	})
            	.then(function()
            	{
            		userRoleTable.remove(selected);
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
			for(let entry of userRoleTable.data.slice())
			{
				userRoleTable.remove(entry);
			}
			request.json("rest/user/config?session="+sessionStorage.getItem("NIWA_SESSION"))
			.then(function(data)
			{
				let userRoles=SC.UserRole.parse(data);
				userRoleTable.add(userRoles.users.concat(userRoles.roles));
			},
			function(error)
			{
				µ.logger.error(error);
				alert("error ocurred");
			});
		}

		let showEditDialog=function(param)
		{
			actionsContainer.disabled=true;

			let isNew=(param===!!param);
			let isUser;
			if(isNew) isUser==param;
			else isUser=param.type==SC.UserRole.Types.USER;

			SC.dlg(function(element)
			{
				let html='<table>';
				if(isNew)
				{
					html+='<tr><td>Name</td><td><input type="text" name="name" required></td></tr>';
					if(isUser) html+='<tr><td>Password</td><td><input type="text" name="password"></td></tr>';
				}
				else
				{
					html='<input type="hidden" name="name" value="'+param.name+'">'+html;
				}
				html+='<tr><td>Roles</td><td><select><option></option>';
				for(let role of userRoles.roles) html+='<option value="'+role.name+'">'+role.name+'</option>';
				html+='</select><button data-action="addRole">+</button>';
				if(!isNew) for(let i=0;i<param.roles.length;i++) html+='<div><button data-action="removeRole">&#128465;</button><input type="hidden" data-path="roles[]" name="'+i+'" value="'+param.roles[i]+'">'+param.roles[i]+'</div>';
				html+='</td></tr>';

				let permissions=new Set(SC.flatten(userRoles.users.map(u=>u.permissions).concat(userRoles.roles.map(r=>r.permissions))).sort(sort));
				html+='<tr><td>Permissions</td><td><input type="text" list="permissions"><button data-action="addPermission">+</button><datalist id="permissions">';
				for(let permission of permissions) html+='<option value="'+permission+'">'+permission+'</option>';
				html+='</datalist>';
				if(!isNew) for(let i=0;i<param.permissions.length;i++) html+='<div><button data-action="removePermission">&#128465;</button><input type="hidden" data-path="permissions[]" name="'+i+'" value="'+param.permissions[i]+'">'+param.permissions[i]+'</div>';
				html+='</td></tr>';

				html+='</table><button data-action="ok">OK</button><button data-action="close">Cancel</button><div class="errorMessage"></div>';

				element.innerHTML=html;
			},{
				modal:true,
				actions:{
					addRole:function(event,element)
					{

						let select=element.previousElementSibling;
						if(select.value)
						{
							let roles=this.querySelectorAll('input[data-path="roles[]"]');
							select.selectedOptions[0].disabled=true;

							let div=document.createElement("div");
							div.innerHTML='<button data-action="removeRole">&#128465;</button><input type="hidden" data-path="roles[]" name="'+roles.length+'" value="'+select.value+'">'+select.value;
							element.parentNode.appendChild(div);

							select.value=null;
						}
					},
					removeRole:function(event,element)
					{
						let input=element.nextElementSibling;
						let select=this.querySelector("select");
						let siblings=Array.from(element.parentElement.parentElement.children);
						let index=siblings.indexOf(element.parentElement);
						siblings=siblings.slice(1+index);
						select.querySelector('[value="'+input.value+'"').disabled=false;

						for(let i=0;i<siblings.length;i++)
						{
							siblings[i].children[1].name=index+i-2;
						}
						input.parentNode.remove();
					},
					addPermission:function(event,element)
					{
						let input=element.previousElementSibling;
						if(input.value)
						{
							let permissions=this.querySelectorAll('input[name^="permissions["]');
							let option=input.list.querySelector('[value="'+input.value+'"');
							if(option)option.disabled=true;

							let div=document.createElement("div");
							div.innerHTML='<button data-action="removePermission">&#128465;</button><input type="hidden" data-path="permissions[]" name="'+permissions.length+'" value="'+input.value+'">'+input.value;
							element.parentNode.appendChild(div);

							input.value=null;
						}
						let permissions=this.querySelectorAll('input[name^="permissions["]');;
					},
					removePermission:function(event,element)
					{
						let input=element.nextElementSibling;

						let list=this.querySelector("datalist");
						let option=list.querySelector('[value="'+input.value+'"');
						if(option)option.disabled=false;

						let siblings=Array.from(element.parentElement.parentElement.children);
						let index=siblings.indexOf(element.parentElement);
						siblings=siblings.slice(1+index);
						for(let i=0;i<siblings.length;i++)
						{
							siblings[i].children[1].name="permissions["+(index+i-3)+"]";
						}

						input.parentNode.remove();
					},
					close:function()
					{
						actionsContainer.disabled=false;
						this.close();
					},
					ok:function(event,element)
					{
						element.disabled=true;
						let nameInput=this.querySelector("[name=name]");
						if(nameInput.checkValidity())
						{
							let values=SC.getValues(this.querySelectorAll("[name]"));
							values.session=sessionStorage.getItem("NIWA_SESSION");
							request({
								url:"rest/user/config/"+(isUser?"user":"role"),
								data:JSON.stringify(values),
								method:(isNew?"POST":"PUT")
							})
							.then(()=>
							{
								actionsContainer.disabled=false;
								this.close();
								reloadTable();
							},
							error=>
							{
								µ.logger.error(error);
								element.disabled=false;
								this.querySelector(".errorMessage").textContent=error.response;
							})
						}
					}
				}
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