(function(µ,SMOD,GMOD,HMOD,SC){

	let InputDialog=GMOD("gui.InputDialog");

	SC=SC({
		UserRole:"UserRole",
		flatten:"flatten"
	});

	let sort=new Intl.Collator(navigator.languages,{sensitivity:"base"}).compare

	let UserRoleEditDialog=µ.Class(InputDialog,{
		/**
		 * @param {Boolean|UserRole} param - true=new user; false=new role; UserRole=edit UserRole
		 * @param {Object} userRoles
		 * @param {UserRole[]} userRoles.users
		 * @param {UserRole[]} userRoles.roles
		 */
		constructor:function(param,userRoles)
		{
			let userRole=null;
			let isNew=(param===!!param); // test boolean
			let isUser;
			let noPermissions=false;
			if(isNew)
			{
				isUser=param;
			}
			else
			{
				userRole=param;
				isUser=(userRole.type==SC.UserRole.Types.USER);
				noPermissions=userRole.noPermissions;
			}

			let html=`<input type="hidden" name="token" value="${sessionStorage.getItem('NIWA_SESSION')}"><table>`;
			if(isNew)
			{
				html+='<tr><td>Name</td><td><input type="text" name="name" required autofocus></td></tr>';
				if(isUser) html+='<tr><td>Password</td><td><input type="text" name="password"></td></tr>';
			}
			else
			{
				html=`<input type="hidden" name="name" value="${param.name}">${html}`;
			}
			html+='<tr><td>Roles</td><td><select><option></option>';
			for(let role of userRoles.roles) html+=`<option value="${role.name}">${role.name}</option>`;
			html+='</select><button data-action="addRole">+</button>';
			if(!isNew)
			{
				for(let i=0;i<param.roles.length;i++)
				{
					let r=param.roles[i]
					html+=`<div><button data-action="removeRole">&#128465;</button><input type="hidden" data-path="roles[]" name="${i}" value="${r}">${r}</div>`;
				}
			}
			html+='</td></tr>';

			let permissions=new Set(SC.flatten(userRoles.users.map(u=>u.permissions).concat(userRoles.roles.map(r=>r.permissions))).sort(sort));
			html+='<tr><td>Permissions</td><td><input type="text" list="permissions"><button data-action="addPermission">+</button><datalist id="permissions">';
			for(let permission of permissions) html+=`<option value="${permission}">${permission}</option>`;
			html+='</datalist>';
			if(!isNew)
			{
				for(let i=0;i<param.permissions.length;i++)
				{
					let p=param.permissions[i];
					html+=`<div><button data-action="removePermission">&#128465;</button><input type="hidden" data-path="permissions[]" name="${i}" value="${p}">${p}</div>`;
				}
			}
			html+='</td></tr>';

			html+='</table><div class="errorMessage"></div>';

			this.mega(html,{
				modal:true,
				actions:{
					addRole:function(event,element)
					{

						let select=element.previousElementSibling;
						if(select.value)
						{
							let roles=this.content.querySelectorAll('input[data-path="roles[]"]');
							select.selectedOptions[0].disabled=true;

							let div=document.createElement("div");
							div.innerHTML=`<button data-action="removeRole">&#128465;</button><input type="hidden" data-path="roles[]" name="${roles.length}" value="${select.value}">${select.value}`;
							element.parentNode.appendChild(div);

							select.value=null;
						}
					},
					removeRole:function(event,element)
					{
						let input=element.nextElementSibling;
						let select=this.content.querySelector("select");
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
							let permissions=this.content.querySelectorAll('input[data-path="permissions[]"]');
							let option=input.list.querySelector('[value="'+input.value+'"');
							if(option)option.disabled=true;

							let div=document.createElement("div");
							div.innerHTML=`<button data-action="removePermission">&#128465;</button><input type="hidden" data-path="permissions[]" name="${permissions.length}" value="${input.value}">${input.value}`;
							element.parentNode.appendChild(div);

							input.value=null;
						}
						let permissions=this.content.querySelectorAll('input[name^="permissions["]');;
					},
					removePermission:function(event,element)
					{
						let input=element.nextElementSibling;

						let list=this.content.querySelector("datalist");
						let option=list.querySelector('[value="'+input.value+'"');
						if(option)option.disabled=false;

						let siblings=Array.from(element.parentElement.parentElement.children);
						let index=siblings.indexOf(element.parentElement);
						siblings=siblings.slice(1+index);
						for(let i=0;i<siblings.length;i++)
						{
							siblings[i].children[1].name=index+i-3;
						}

						input.parentNode.remove();
					},
					OK:function(values,element)
					{
						this.content.disabled=true;

						return request({
							url:"rest/user/config/"+(isUser?"user":"role"),
							data:JSON.stringify(values),
							method:(isNew?"POST":(noPermissions?"PATCH":"PUT"))
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
			});
		}
	});

	SMOD("UserRoleEditDialog",UserRoleEditDialog);

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);