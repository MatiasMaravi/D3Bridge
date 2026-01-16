import type { RenderProps } from "@anywidget/types";
import "./button.css";

/* Specifies attributes defined with traitlets in ../src/vizpro/widgets.py */
interface ButtonModel {
	description: string;
	disabled: boolean;
}

function render({ model, el }: RenderProps<ButtonModel>) {
	let btn = document.createElement("button");
	btn.innerHTML = model.get("description");
	btn.addEventListener("click", () => {
		model.set("_clicked", !model.get("_clicked"));
		model.save_changes();
	});
	model.on("change:_clicked", () => {
		btn.innerHTML = model.get("description");
	});
	el.classList.add("vizpro");
	el.appendChild(btn);
}

export default { render };
