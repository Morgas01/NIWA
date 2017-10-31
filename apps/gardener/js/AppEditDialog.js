(function(µ,SMOD,GMOD,HMOD,SC){

	let InputDialog=GMOD("gui.InputDialog");

	SC=SC({
		Organizer:"Organizer"
	});

	let sort=new Intl.Collator(navigator.languages,{sensitivity:"base"}).compare

	let AppEditDialog=µ.Class(InputDialog,{
		constructor:function(appConfig,dependencies=[],appList)
		{
			let org=new SC.Organizer(appList).group("name","name");
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
			<select name="communication">
				<option value="null" ${appConfig.communication==null?"checked":""}>default</option>
				<option value="true" ${appConfig.communication==true?"checked":""}>all</option>
				<option value="false" ${appConfig.communication==false?"checked":""}>none</option>
				<option value="specific" ${typeof appConfig.communication=="object"?"checked":""}>specific</option>
			</select>
		</td>
	</tr>
	${dependencies.map(function()
	{
		return `
	<tr>
		<td>
			Communication
		</td>
		<td>
			<select name="communication">
				<option value="null" ${appConfig.communication==null?"checked":""}>default</option>
				<option value="true" ${appConfig.communication==true?"checked":""}>all</option>
				<option value="false" ${appConfig.communication==false?"checked":""}>none</option>
				<option value="specific" ${typeof appConfig.communication=="object"?"checked":""}>specific</option>
			</select>
		</td>
	</tr>
`	;
	}).join("\n")
	}
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