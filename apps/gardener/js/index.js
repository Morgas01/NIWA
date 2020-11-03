(function(µ,SMOD,GMOD,HMOD,SC){

	let request=GMOD("request");

	SC=SC({
		dlg:"gui.Dialog.Input"
	});

	let control=document.getElementById("control");

	let logOutBtn=document.getElementById("logOut");
	let logInBtn=document.getElementById("logIn");


	let updateSessionDisplay=function()
	{
		let sessionToken=localStorage.getItem("NIWA_SESSION");
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
			userPromise=Promise.reject();
		}
		userPromise.then(function(username)
		{
			control.classList.add("loggedIn");
			logOutBtn.textContent="\uD83D\uDEAB "+username;
		},
		function()
		{
			control.classList.remove("loggedIn");
			logOutBtn.textContent="";
		});
	};

	updateSessionDisplay();

	logInBtn.addEventListener("click",function()
	{
		new SC.dlg(
`
<input type="hidden" name="token" value="${localStorage.getItem('NIWA_SESSION')}">
<table>
	<tr>
		<td>Name</td>
		<td>
			<input name="username" type="text" autofocus>
		</td>
	</tr>
	<tr>
		<td>Password</td>
		<td>
			<input name="password" type="password">
		</td>
	</tr>
</table>
`
		,{
			actions:{
				OK:function(values,target,dialog)
				{
					return request({
						url:"rest/user/logIn",
						data:JSON.stringify(values)
					})
					.then(function(token)
					{
						localStorage.setItem("NIWA_SESSION",token);
						updateSessionDisplay();
						let mainFrame=document.querySelector("iframe");
						mainFrame.src=mainFrame.src;
					},
					error=>
					{
						if(error.status<500)
						{
							localStorage.setItem("NIWA_SESSION",error.response);
							for(let input of this.content.querySelectorAll("[name]")) input.setCustomValidity("invalid");
						}
						µ.logger.error(error);
						return Promise.reject();
					});
				},
			}
		})
	});
	logOutBtn.addEventListener("click",function()
	{
		let sessionToken=localStorage.getItem("NIWA_SESSION");
		if(sessionToken)
		{
			userPromise=request({
				url:"rest/user/logOut",
				data:JSON.stringify(sessionToken)
			})
			.catch(request.allowedStatuses([205]))
			.then(
			updateSessionDisplay,
			function(error)
			{
				µ.logger.error(error);
				alert("error occurred\n"+error.message);
			});
		}
	});


})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);