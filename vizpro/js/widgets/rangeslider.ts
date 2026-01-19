import type { RenderProps } from "@anywidget/types";
import "./widgets.css";

interface RangeSliderModel {
    description: string;
    disabled: boolean;
    fromValue: number;
    toValue: number;
    step: number;
    minValue: number;
    maxValue: number;
}

export interface RangeSliderParams {
    description: string;
    disabled: boolean;
    fromValue: number;
    toValue: number;
    step: number;
    minValue: number;
    maxValue: number;
    setFromTo: (from: number, to: number) => void;
    setMinMax: (min: number, max: number) => void;
}

const WIDGET_MARGIN = { top: 20, right: 20, bottom: 20, left: 20 };

class RangeSlider {
    private rangeValue!: HTMLSpanElement;
    private fromSlider!: HTMLInputElement;
    private toSlider!: HTMLInputElement;
    private setValues!: (from: number, to: number) => void;

    updateSliderValues(from: number, to: number) {
        if (this.rangeValue) {
            this.rangeValue.textContent = `${from} - ${to}`;
        }
        
        if (this.fromSlider && this.toSlider) {
            const isFromActive = this.fromSlider === document.activeElement;
            const isToActive = this.toSlider === document.activeElement;

            if (!isFromActive && parseFloat(this.fromSlider.value) !== from) {
                this.fromSlider.value = from.toString();
            }
            if (!isToActive && parseFloat(this.toSlider.value) !== to) {
                this.toSlider.value = to.toString();
            }
        }
    }

    constructor(private element: HTMLElement){}

    onDisabledChanged(disabled: boolean) {
        if (this.fromSlider && this.toSlider) {
            if (disabled) {
                this.fromSlider.setAttribute("disabled", "");
                this.toSlider.setAttribute("disabled", "");
            } else {
                this.fromSlider.removeAttribute("disabled");
                this.toSlider.removeAttribute("disabled");
            }
        }
    }

    plot(params: RangeSliderParams) {
        this.element.innerHTML = "";
        
        const { description, disabled, fromValue, toValue, step, minValue, maxValue, setFromTo, setMinMax } = params;
        
        this.setValues = setFromTo;
        
        // Creamos la estructura
        const rangeOutsideContainer = this.createContainer(description);
        const slidersControl = this.createSlidersControl(rangeOutsideContainer);
        
        this.createSliders(slidersControl, step, minValue, maxValue, fromValue, toValue);

        if (disabled) {
            this.onDisabledChanged(disabled);
        }

        const from = parseFloat(this.fromSlider.value);
        const to = parseFloat(this.toSlider.value);
        
        this.updateValues(from, to); // Actualiza texto inicial
        this.updateValues(fromValue, toValue); // Asegura consistencia
        setMinMax(minValue, maxValue);
        
        this.setupEventListeners();
        this.element.appendChild(rangeOutsideContainer);
    }

    private createSlider(container: HTMLDivElement, step: number, min: number, max: number, value: number, classname?: string): HTMLInputElement {
        const slider = document.createElement("input");
        if (classname) {
            slider.classList.add(classname);
        }

        slider.setAttribute("type", "range");
        slider.setAttribute("step", step.toString());
        slider.setAttribute("min", min.toString());
        slider.setAttribute("max", max.toString());
        slider.value = value.toString();
        // Nota: ya no agregamos clases de colores aquí, todo es CSS
        container.appendChild(slider);
        return slider;
    }

    private createContainer(description: string): HTMLDivElement {
        const rangeOutsideContainer = document.createElement("div");
        rangeOutsideContainer.classList.add("vp-range_outside_container");
        // Quitamos margin auto aquí porque el CSS ya lo maneja mejor con flex
        
        // 1. Izquierda: Descripción
        const rangeDescription = document.createElement("span");
        rangeDescription.classList.add("vp-range_description");
        rangeDescription.textContent = description;
        rangeOutsideContainer.appendChild(rangeDescription);

        // 2. Centro: Contenedor de Sliders
        const rangeInsideContainer = document.createElement("div");
        rangeInsideContainer.classList.add("vp-range_inside_container");
        rangeOutsideContainer.appendChild(rangeInsideContainer);

        // 3. Derecha: Valores
        this.rangeValue = document.createElement("span");
        this.rangeValue.classList.add("vp-range_value");
        rangeOutsideContainer.appendChild(this.rangeValue);

        return rangeOutsideContainer;
    }

    private createSlidersControl(container: HTMLDivElement): HTMLDivElement {
        const rangeInsideContainer = container.querySelector('.vp-range_inside_container') as HTMLDivElement;
        
        const slidersControl = document.createElement("div");
        slidersControl.classList.add("vp-sliders_control");
        // El CSS ::before se encarga de pintar la barra naranja aquí automáticamente
        
        rangeInsideContainer.appendChild(slidersControl);
        return slidersControl;
    }

    private createSliders(container: HTMLDivElement, step: number, min: number, max: number, fromValue: number, toValue: number): void {
        this.fromSlider = this.createSlider(container, step, min, max, fromValue, "active-slider");
        this.toSlider = this.createSlider(container, step, min, max, toValue);
    }

    private handleFromChange(): void {
        const fromValue = parseFloat(this.fromSlider.value);
        const toValue = parseFloat(this.toSlider.value);
        if (fromValue > toValue) {
            this.fromSlider.value = this.toSlider.value;
        }
        this.updateValues(parseFloat(this.fromSlider.value), toValue);
    }

    private handleToChange(): void {
        const fromValue = parseFloat(this.fromSlider.value);
        const toValue = parseFloat(this.toSlider.value);
        if (toValue < fromValue) {
            this.toSlider.value = this.fromSlider.value;
        }
        this.updateValues(fromValue, parseFloat(this.toSlider.value));
    }

    private updateValues(from: number, to: number) {
        this.rangeValue.textContent = `${from} - ${to}`;
        this.setValues(from, to);
    }

    private resetZIndex(): void {
        // Quitamos la clase activa de ambos para que vuelvan a su estado natural
        this.fromSlider.classList.remove("active-slider");
        this.toSlider.classList.remove("active-slider");
    }

    private setupEventListeners(): void {
        this.fromSlider.addEventListener("input", () => this.handleFromChange());
        this.toSlider.addEventListener("input", () => this.handleToChange());
        
 
        this.fromSlider.addEventListener("pointerdown", () => this.setActiveSlider(this.fromSlider, this.toSlider));
        this.toSlider.addEventListener("pointerdown", () => this.setActiveSlider(this.toSlider, this.fromSlider));

        this.fromSlider.addEventListener("blur", () => this.resetZIndex());
        this.toSlider.addEventListener("blur", () => this.resetZIndex());
    }

    // Asegúrate de que setActiveSlider esté así (ya lo tenías bien, pero confirmamos):
    private setActiveSlider(active: HTMLInputElement, inactive: HTMLInputElement): void {
        active.classList.add("active-slider");
        inactive.classList.remove("active-slider");
    }


}

function render({ model, el }: RenderProps<RangeSliderModel>) {
    el.classList.add("vizpro");
    const widget = new RangeSlider(el);

    const setFromTo = (from: number, to: number) => {
        model.set("fromValue", from);
        model.set("toValue", to);
        model.save_changes();
    }

    const setMinMax = (min: number, max: number) => {
        model.set("minValue", min);
        model.set("maxValue", max);
        model.save_changes();
    }

    const replot = () => {
        widget.plot({
            description: model.get("description"),
            disabled: model.get("disabled"),
            fromValue: model.get("fromValue"),
            toValue: model.get("toValue"),
            step: model.get("step"),
            minValue: model.get("minValue"),
            maxValue: model.get("maxValue"),
            setFromTo: setFromTo,
            setMinMax: setMinMax
        });
    };

    replot();

    model.on("change:description", replot);
    model.on("change:disabled", replot);
    model.on("change:step", replot);
    model.on("change:minValue", replot);
    model.on("change:maxValue", replot);
    
    model.on("change:fromValue change:toValue", () => {
        widget.updateSliderValues(model.get("fromValue"), model.get("toValue"));
    });
}

export default { render };