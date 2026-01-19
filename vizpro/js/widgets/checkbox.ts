import type { RenderProps } from "@anywidget/types";

import "./widgets.css";

/* Specifies attributes defined with traitlets in ../src/vizpro/widgets.py */
interface CheckboxModel {
    description: string;
    disabled: boolean;
    checked: boolean;
}

export interface CheckboxParams {
    description: string;
    disabled: boolean;
    checked: boolean;
    setChecked: (state: { checked: boolean }) => void;
}


class Checkbox {
    private checkbox!: HTMLInputElement;
    private container!: HTMLDivElement;
    private label!: HTMLLabelElement;
    private instanceId: string;

    constructor(private element: HTMLElement) {
        // ID único para identificar cada instancia de vista
        this.instanceId = Math.random().toString(36).substring(7);
        console.log(`[Checkbox ${this.instanceId}] Constructor called`);
    }

    onDescriptionChanged(description: string) {
        if (!this.label) {
            this.label = document.createElement("label");
            this.label.htmlFor = this.checkbox.id;
            this.label.classList.add("vp_checkbox_label");
            this.container.appendChild(this.label);
        }
        this.label.textContent = description;
    }
    onDisabledChanged(disabled: boolean) {
        if (this.checkbox) {
            if (disabled) this.checkbox.setAttribute("disabled", "");
            else this.checkbox.removeAttribute("disabled");
        }
    }

    onCheckedChanged(checked: boolean) {
        console.log(`[Checkbox ${this.instanceId}] onCheckedChanged called with:`, checked);
        // console.log(`[Checkbox ${this.instanceId}] this.checkbox exists:`, !!this.checkbox);
        if (this.checkbox) {
            // Validación para evitar ciclos y parpadeos al recibir el eco de Python
            if (this.checkbox.checked !== checked) {
                console.log(`[Checkbox ${this.instanceId}] Updating DOM to:`, checked);
                this.checkbox.checked = checked;
            }
        }
    }

    plot(params: CheckboxParams) {
        const { description, disabled, checked, setChecked } = params;

        this.container = document.createElement("div");
        this.container.classList.add("checkbox_container");

        this.checkbox = document.createElement("input");
        this.checkbox.type = "checkbox";
        this.checkbox.classList.add("vp_checkbox");
        
        // Initial state
        this.checkbox.checked = checked;
        console.log(`[Checkbox ${this.instanceId}] Plot called, initial checked:`, checked);

        this.checkbox.addEventListener("change", (e) => {
            setChecked({ checked: (e.target as HTMLInputElement).checked });
        });
        this.onDescriptionChanged(description);
        this.onDisabledChanged(disabled);
        this.container.appendChild(this.checkbox);
        this.element.appendChild(this.container);
    }

}

function render({ model, el }: RenderProps<CheckboxModel>) {
    el.classList.add("vizpro");

    const widget = new Checkbox(el);

    const setChecked = (state: { checked: boolean }) => {
        model.set("checked", state.checked);
        model.save_changes();
    };

    widget.plot({
        description: model.get("description"),
        disabled: model.get("disabled"),
        checked: model.get("checked"),
        setChecked: setChecked
    });

    model.on("change:description", () => {
        widget.onDescriptionChanged(model.get("description"));
    });

    model.on("change:disabled", () => {
        widget.onDisabledChanged(model.get("disabled"));
    });

    model.on("change:checked", () => {
        console.log(`[Checkbox] model.on change:checked fired, new value:`, model.get("checked"));
        widget.onCheckedChanged(model.get("checked"));
    });
}

export default { render };