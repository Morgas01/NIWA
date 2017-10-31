(function(µ,SMOD,GMOD,HMOD,SC){

	let InputDialog=GMOD("gui.InputDialog");

	SC=SC({
		Register:"Register"
	});

	let sort=new Intl.Collator(navigator.languages,{sensitivity:"base"}).compare;
	let getCommunicationSelect=function(path,name)
	{
		let select=document.createElement("SELECT");
		if(path) select.dataset.path=path
		select.name=name;

		let option;
		option=document.createElement("OPTION");
		option.textContent="Default";
		select.appendChild(option);

		option=document.createElement("OPTION");
		option.value=true;
		option.textContent="All";
		select.appendChild(option);

		option=document.createElement("OPTION");
		option.value=false;
		option.textContent="None";
		select.appendChild(option);

		return select;
	};

	let getAppCommunication=function(name,contexts)
	{
		let fieldset=document.createElement("FIELDSET");
		let legend=document.createElement("LEGEND");
		legend.textContent=name;
		let removeBtn=document.createElement("BUTTON");
		addBtn.dataset.action="removeCommContext";
		addBtn.textContent="\uD83D\uDDD1";
		fieldset.appendChild(legend);

		let select=document.createElement("SELECT");
		for(let context of contexts)
		{
			let option=document.createElement("OPTION");
			option.value=option.textContent=context;
			select.appendChild(option);
		}
		fieldset.appendChild(select);
		let addBtn=document.createElement("BUTTON");
		addBtn.dataset.action="addCommContext";
		addBtn.textContent="+";
	};
	let getAppContext=function(name,context,index)
	{
		let container=document.createElement("SPAN");
		container.textContent=context;
		let input=document.createElement("INPUT");
		input.type="hidden";
		input.value=context;
		input.path="communications."+name;
		input.name=index;
		container.appendChild(input);
	}

	let AppEditDialog=µ.Class(InputDialog,{
		constructor:function(appConfig,dependencies=[],appList)
		{
			let appNames=new SC.Register(1,Array);
			for(let app of applist)
			{
				if(app.name) appNames[app.name].push(app.context);
			}
			let html=`
<table>
	<tr>
		<td>
			Auto start
		</td>
		<td>
			<select name="autoStart">
				<option value="null" ${appConfig.autoStart==null?"checked":""}>default</option>
				<option value="true" ${appConfig.autoStart==true?"checked":""}>true</option>
				<option value="false" ${appConfig.autoStart==false?"checked":""}>false</option>
			</select>
		</td>
	</tr>
	<tr>
		<td>
			log level
		</td>
		<td>
			<select name="logLevel">
				<option value="null" ${appConfig.autoStart==null?"checked":""}>default</option>
				<option value="TRACE" ${appConfig.logLevel==TRACE?"checked":""}>TRACE</option>
                <option value="DEBUG" ${appConfig.logLevel==DEBUG?"checked":""}>DEBUG</option>
                <option value="INFO" ${appConfig.logLevel==INFO?"checked":""}>INFO</option>
                <option value="WARN" ${appConfig.logLevel==WARN?"checked":""}>WARN</option>
                <option value="ERROR" ${appConfig.logLevel==ERROR?"checked":""}>ERROR</option>
                <option value="FATAL" ${appConfig.logLevel==FATAL?"checked":""}>FATAL</option>
			</select>
		</td>
	</tr>
	<tr>
		<td>
			Communication
		</td>
		<td>
			<select class="CommunicationSelect">
				<option></option>
				${Object.keys(appNames).sort(sort).map(appName=>
				`<option value="${appName}" class="${dependencies.includes(appName)?'dependency':''}">${appName}</option>
				).join("\n")}
			</select>
			<button data-action="addCommApp">+</button>
			<div class="communications"></div>
		</td>
	</tr>
</table>
`			;

			this.mega(html,{
				modal:true,
				actions:{
					OK:function(values,element)
					{
						this.content.disabled=true;

						return request({
							url:"",
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
			});
		}
	});

	SMOD("AppEditDialog",AppEditDialog);

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);