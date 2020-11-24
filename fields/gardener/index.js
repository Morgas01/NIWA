let acre = document.body;

let updateFields=function()
{
	fetch("rest/fields/list")
		.then(response => response.json())
		.then(function (list)
		{
			acre.innerHTML="";
			for (let field of list)
			{
				let container = document.createElement("DIV");
				container.classList.add("field");
				container.dataset.index = field.index;
				container.dataset.name = field.name;
				container.dataset.state = field.state;
				container.innerHTML =
					`<span class="field-name"><a class="field-name" href="/${field.name}">${field.name}</a></span>
<span class="field-state" data-action="open">🔒</span>
<span class="field-state" data-action="close">🔓</span>
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
<button data-action="addField">add</button>`;
			acre.appendChild(addFieldElement);
		});
};


let postAndUpdate = function(url,data)
{
	return fetch(url,{
		method: "POST",
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
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

acre.addEventListener("click",event=>
{
	let action=event.target.dataset.action;
	if(!action) return;
	switch (action)
	{
		case "open":
		{
			let field=event.target.closest(".field");
			let name=field.dataset.name;
			postAndUpdate("rest/fields/open",{name});
			break;
		}
		case "close":
		{
			let field=event.target.closest(".field");
			let name=field.dataset.name;
			postAndUpdate("rest/fields/close",{name});
			break;
		}
		case "addField":
			let name=document.querySelector('[name="field_name"]').value;
			let path=document.querySelector('[name="field_path"]').value;
			postAndUpdate("rest/fields/add",{name,path});
			break;
	}
});

updateFields();