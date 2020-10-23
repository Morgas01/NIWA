(function(µ,SMOD,GMOD,HMOD,SC){

	let InputDialog=GMOD("gui.InputDialog");

	SC=SC({
		register:"register",
		request:"request"
	});

	let sort=new Intl.Collator(navigator.languages,{sensitivity:"base"}).compare;

	let getGeneralCommunicationSelect=function(name,path)
	{
		let select=document.createElement("SELECT");
		if(path) select.dataset.path=path
		select.name=name;

		let option;
		option=document.createElement("OPTION");
		option.value=null;
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
		fieldset.dataset.appName=name;
		let legend=document.createElement("LEGEND");
		legend.textContent=name;
		let removeBtn=document.createElement("BUTTON");
		removeBtn.dataset.action="removeCommApp";
		removeBtn.textContent="\uD83D\uDDD1";
		legend.appendChild(removeBtn);
		fieldset.appendChild(legend);

		let select=document.createElement("SELECT");
		select.classList.add("appCommunicationSelect");
		for(let context of contexts)
		{
			let option=document.createElement("OPTION");
			option.value=option.textContent=context;
			select.appendChild(option);
		}
		select.value=null;
		fieldset.appendChild(select);
		let addBtn=document.createElement("BUTTON");
		addBtn.dataset.action="addCommContext";
		addBtn.textContent="+";
		fieldset.appendChild(addBtn);

		let appComms=document.createElement("DIV");
		appComms.classList.add("appCommunications");
		fieldset.appendChild(appComms)

		return fieldset;
	};
	let getAppContext=function(name,context,index)
	{
		let container=document.createElement("DIV");
		container.textContent=context;
		let input=document.createElement("INPUT");
		input.type="hidden";
		input.value=context;
		input.dataset.path="communication."+name+"[]";
		input.name=index;
		container.appendChild(input);
		let removeBtn=document.createElement("BUTTON");
		removeBtn.dataset.action="removeCommContext";
		removeBtn.textContent="\uD83D\uDDD1";
		container.appendChild(removeBtn);

		return container;
	}

	let AppEditDialog=µ.Class(InputDialog,{
		constructor:function(app,appList)
		{
			app.dependencies=app.dependencies||[];

			let appNames=SC.register(1,()=>[]);
			for(let app of appList)
			{
				if(app.name) appNames[app.name].push(app.context);
			}
			let html=`
<input type="hidden" name="token" value="${localStorage.getItem('NIWA_SESSION')}">
<input type="hidden" name="context" value="${app.context}">
<table>
	<tr>
		<td>
			Auto start
		</td>
		<td>
			<select name="autoStart">
				<option value="null" ${app.autoStart==null?"selected":""}>default</option>
				<option value="true" ${app.autoStart==true?"selected":""}>true</option>
				<option value="false" ${app.autoStart==false?"selected":""}>false</option>
			</select>
		</td>
	</tr>
	<tr>
		<td>
			log level
		</td>
		<td>
			<select name="logLevel">
				<option value="null" ${app.autoStart==null?"selected":""}>default</option>
				<option value="TRACE" ${app.logLevel=="TRACE"?"selected":""}>TRACE</option>
                <option value="DEBUG" ${app.logLevel=="DEBUG"?"selected":""}>DEBUG</option>
                <option value="INFO" ${app.logLevel=="INFO"?"selected":""}>INFO</option>
                <option value="WARN" ${app.logLevel=="WARN"?"selected":""}>WARN</option>
                <option value="ERROR" ${app.logLevel=="ERROR"?"selected":""}>ERROR</option>
                <option value="FATAL" ${app.logLevel=="FATAL"?"selected":""}>FATAL</option>
			</select>
		</td>
	</tr>
	<tr>
		<td>
			Communication
		</td>
		<td>
			<select class="communicationSelect">
				${Object.keys(appNames).sort(sort).map(appName=>
				`<option value="${appName}" class="${app.dependencies.includes(appName)?'dependency':''}">${appName}</option>`
				).join("\n")}
			</select>
			<button data-action="addCommApp">+</button>
			<div class="communications"></div>
		</td>
	</tr>
</table>
<div class="errorMessage"></div>
`			;

			let commContainer;
			let commSelect;
			this.mega(html,{
				modal:true,
				actions:{
					addCommApp:function()
					{
						if(!commSelect.value) return;
						if(commContainer.children[0].tagName==="SELECT")
						{
							commContainer.children[0].remove();
						}
						let appComm=getAppCommunication(commSelect.value,appNames[commSelect.value]);
						let appComms=appComm.querySelector(".appCommunications");
						appComms.appendChild(getGeneralCommunicationSelect(commSelect.value,"communication"));
						commContainer.appendChild(appComm);

						commSelect.selectedOptions[0].disabled=true;
						commSelect.value=null;
					},
					removeCommApp:function(event,target)
					{
						let appComm=target.parentNode.parentNode;
						let option=commSelect.querySelector(`option[value="${appComm.dataset.appName}"]`);
						if(option) option.disabled=false;
						appComm.remove();
						if(commContainer.children.length==0)
						{
							commContainer.appendChild(getGeneralCommunicationSelect("communication"));
						}
					},
					addCommContext:function(event,target)
					{
						let select=target.previousElementSibling;
						if(!select.value) return;
						let appComms=target.parentNode.querySelector(".appCommunications");
						if(appComms.children[0].tagName==="SELECT")
						{
							appComms.children[0].remove();
						}
						appComms.appendChild(getAppContext(target.parentNode.dataset.appName,select.value,appComms.children.length));

						select.selectedOptions[0].disabled=true;
						select.value=null;
					},
					removeCommContext:function(event,target)
					{
						let appComms=target.parentNode.parentNode;
						let option=appComms.parentNode.querySelector(`.appCommunicationSelect option[value="${target.previousElementSibling.value}"]`);
						if(option) option.disabled=false;
						appComms.removeChild(target.parentNode);
						if(appComms.children.length==0)
						{
							appComms.appendChild(getGeneralCommunicationSelect(appComms.parentNode.dataset.appName,"communication"));
						}
						else
						{
							for(let i=0;i<appComms.children.length;i++)
							{
								appComms.children[i].children[0].name=i;
							}
						}
					},
					OK:function(values,element)
					{
						this.content.disabled=true;
						values.autoStart=JSON.parse(values.autoStart);
						if(values.logLevel==="null") values.logLevel=null;
						if(typeof values.communication==="string")values.communication=JSON.parse(values.communication);
						else
						{
							for(let key in values.communication)
							{
								if(typeof values.communication[key]==="string")values.communication[key]=JSON.parse(values.communication[key]);
							}
						}

						return SC.request({
							url:"rest/apps/config",
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

			commContainer=this.content.querySelector(".communications");
			commSelect=this.content.querySelector(".communicationSelect");
			commSelect.value=null;
			if(typeof app.communication!=="object")
			{
				let select=getGeneralCommunicationSelect("communication")
				commContainer.appendChild(select);
				if(app.communication==null) select.value="null";
				else select.value=""+app.communication;
			}
			else
			{
				for(let context in app.communication)
				{
					let appComm=getAppCommunication(context,appNames[context]);
					let appComms=appComm.querySelector(".appCommunications");

					let appCommData=app.communication[context];
					if(typeof appCommData!=="object")
					{
						let select=getGeneralCommunicationSelect(context,"communication");
						if(appCommData==null) select.value="null";
						else select.value=""+appCommData;

						appComms.appendChild(select);
					}
					else
					{
						for(let i=0;i<appCommData.length;i++)
						{
							appComms.appendChild(getAppContext(context,appCommData[i],i));
						}
					}

					commContainer.appendChild(appComm);
				}
			}
		}
	});

	SMOD("AppEditDialog",AppEditDialog);

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);