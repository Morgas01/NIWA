let updateFields=function()
{
	fetch("rest/fields/list")
		.then(response => response.json())
		.then(function (list)
		{
			let acre = document.body;
			acre.innerHTML="";
			for (let field of list)
			{
				let container = document.createElement("DIV");
				container.classList.add("field");
				container.dataset.index = field.index;
				container.dataset.state = field.state;
				container.innerHTML =
					`<span class="field-name"><a class="field-name" href="/${field.name}">${field.name}</a></span>
<span class="field-state">${field.state}</span>
<span class="field-path">${field.path}</span>
<div class="field-neighbors">${
						field.neighbors.map(n => `<span>${n}</span>`).join("")
					}</div>`;

				acre.appendChild(container);
			}

			let addFieldElement=document.createElement("DIV");
			addFieldElement.classList.add("field-add");
			addFieldElement.innerHTML=
`
<table>
	<tbody>
		<tr><td>name</td><td><input type="text" name="field_name"/></td></tr>
		<tr><td>path</td><td><input type="text" name="field_path"/></td></tr>
	</tbody>
</table>
<button>add</button>`;
			addFieldElement.querySelector("button").addEventListener("click",addField);
			acre.appendChild(addFieldElement);
		});
};

let addField=function()
{
	let name=document.querySelector('[name="field_name"]').value;
	let path=document.querySelector('[name="field_path"]').value;
	fetch("rest/fields/add",{
		method: "POST",
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({name,path})
	}).then(r=>r.json())
	.then(function(result)
	{
		if(!result.result||result.error)
		{
			console.error(result);
			alert(result.error);
		}
		else
		{
			updateFields();
		}
	});
};

updateFields();