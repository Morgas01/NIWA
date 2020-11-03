let updateFields=function()
{
	fetch("rest/fields/list")
		.then(response => response.json())
		.then(function (list)
		{
			let acre = document.body;
			for (let field of list)
			{
				let container = document.createElement("DIV");
				container.classList.add("field");
				container.dataset.index = field.index;
				container.dataset.state = field.state;
				container.innerHTML =
					`<span class="field-name">${field.name}</span>
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
			acre.appendChild(addFieldElement);
		});
};

updateFields();