(function(µ,SMOD,GMOD,HMOD,SC){

	let request=GMOD("request");

	SC=SC({
		dlg:"gui.dialog"
	});

	let control=document.getElementById("control");
	let sessionCheckButtons=document.querySelectorAll(".sessionCheck");

	let logOutBtn=document.getElementById("logOut");
	let logInBtn=document.getElementById("logIn");


	let updateSessionDisplay=function()
	{
		let sessionToken=sessionStorage.getItem("NIWA_SESSION");
		let userPromise=null;
		if(sessionToken)
		{
			userPromise=request({
				url:"rest/user/getCurrentName",
				data:JSON.stringify(sessionToken)
			});
		}
		else
		{
			userPromise=Promise.resolve();
		}
		userPromise.catch(function(error)
		{
			sessionStorage.removeItem("NIWA_SESSION");
		})
		.then(function(username)
		{
			if(username)
			{
				for(let button of sessionCheckButtons)
				{
					button.disabled=false;
				}
				control.classList.add("loggedIn");
				logOutBtn.textContent="\uD83D\uDEAB "+username;
			}
			else
			{
				for(let button of sessionCheckButtons)
				{
					button.disabled=true;
				}
				control.classList.remove("loggedIn");
				logOutBtn.textContent="";
			}
		});
	};

	updateSessionDisplay();

	logInBtn.addEventListener("click",function()
	{
		SC.dlg(
`
<table>
	<tr>
		<td>Name</td>
		<td>
			<input name="name" type="text">
		</td>
	</tr>
	<tr>
		<td>Password</td>
		<td>
			<input name="password" type="password">
		</td>
	</tr>
</table>
<button data-action="ok">OK</button><button data-action="close">Cancel</button>
`
		,{
			actions:{
				ok:function(event,target,dialog)
				{
					request({
						url:"rest/user/logIn",
						data:JSON.stringify({
							token:sessionStorage.getItem("NIWA_SESSION"),
							username:dialog.querySelector("[name=name]").value,
							password:dialog.querySelector("[name=password]").value
						})
					})
					.then(function(token)
					{
						sessionStorage.setItem("NIWA_SESSION",token);
						updateSessionDisplay();
						dialog.close();
					});
				},
			}
		})
	});
	logOutBtn.addEventListener("click",function()
	{
		let sessionToken=sessionStorage.getItem("NIWA_SESSION");
		if(sessionToken)
		{
			userPromise=request({
				url:"rest/user/logOut",
				data:JSON.stringify(sessionToken)
			})
			.then(updateSessionDisplay);
		}
	});


})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);