import type { RenderProps } from "@anywidget/types";

import "./widgets.css";

/* Specifies attributes defined with traitlets in ../src/vizpro/widgets.py */
interface ButtonModel {
	description: string;
	disabled: boolean;
	_clicked: boolean;
}

export interface ButtonParams {
    description: string;
    disabled: boolean;
    setClicked: () => void;
}


class Button {
	private button!: HTMLButtonElement;
	private container!: HTMLDivElement;

	constructor(private element: HTMLElement) {}

	onDescriptionChanged(description: string) {
		if (this.button) {
			this.button.innerHTML = description;
		}
	}

	onDisabledChanged(disabled: boolean) {
		if (this.button) {
			if (disabled) this.button.setAttribute("disabled", "");
			else this.button.removeAttribute("disabled");
		}
	}

	plot(params: ButtonParams) {
		const { description, disabled, setClicked } = params;

		this.container = document.createElement("div");
		this.container.classList.add("button_container");

		this.button = document.createElement("button");
		this.button.classList.add("vp_button");
		this.button.addEventListener("click", setClicked);

		this.onDescriptionChanged(description);
		this.onDisabledChanged(disabled);

		this.container.appendChild(this.button);
		this.element.appendChild(this.container);
	}
}

function render({ model, el }: RenderProps<ButtonModel>) {
	el.classList.add("vizpro");

	const widget = new Button(el);

	const setClicked = () => {
		model.set("_clicked", !model.get("_clicked"));
		model.save_changes();
	};

	widget.plot({
		description: model.get("description"),
		disabled: model.get("disabled"),
		setClicked,
	});

	model.on("change:description", () => {
		widget.onDescriptionChanged(model.get("description"));
	});

	model.on("change:disabled", () => {
		widget.onDisabledChanged(model.get("disabled"));
	});
}

export default { render };
