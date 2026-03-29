import type { RenderProps } from "@anywidget/types";
import "./range_double.css";

interface RangeDoubleModel {
  min: number;
  max: number;
  step: number;
  fromValue: number;
  toValue: number;
  //Opcional
  label?: string;
}

function render({ model, el }: RenderProps<RangeDoubleModel>) {
  // 1. Leer configuración del modelo de Python (con valores por defecto)
  const min = model.get("min") ?? 0;
  const max = model.get("max") ?? 100;
  const step = model.get("step") ?? 1;
  const initialValueFrom: number = model.get("fromValue") ?? min;
  const initialValueTo: number = model.get("toValue") ?? max;
  const label: string = model.get("label") ?? "";
  const widthSlider = 240; // Ancho fijo del slider en píxeles

  // 2. Crear contenedor principal
  el.classList.add("vp-range-double-container");

  const form = document.createElement("form");
  form.classList.add("vp-range-double-form");

  // 3. Etiqueta
  const labelEl = document.createElement("div");
  labelEl.classList.add("vp-range-double-label");
  labelEl.textContent = label;
  form.appendChild(labelEl);

  // 4. Contenedor del slider
  const sliderContainer = document.createElement("div");
  sliderContainer.classList.add("vp-range-double-slider");
  sliderContainer.style.width = `${widthSlider}px`;

  // 4.1 Track de fondo
  const trackBg = document.createElement("div");
  trackBg.classList.add("vp-range-double-track-bg");
  sliderContainer.appendChild(trackBg);

  // 4.2 Track fill (barra activa)
  const trackFill = document.createElement("div");
  trackFill.classList.add("vp-range-double-track-fill");
  sliderContainer.appendChild(trackFill);

  // 4.3 Input mínimo
  const inputMin = document.createElement("input");
  inputMin.type = "range";
  inputMin.min = String(min);
  inputMin.max = String(max);
  inputMin.step = String(step);
  inputMin.value = String(initialValueFrom);
  inputMin.classList.add("vp-range-double-input");
  sliderContainer.appendChild(inputMin);

  // 4.4 Input máximo
  const inputMax = document.createElement("input");
  inputMax.type = "range";
  inputMax.min = String(min);
  inputMax.max = String(max);
  inputMax.step = String(step);
  inputMax.value = String(initialValueTo);
  inputMax.classList.add("vp-range-double-input");
  sliderContainer.appendChild(inputMax);

  form.appendChild(sliderContainer);

  // 5. Output para mostrar valores
  const output = document.createElement("output");
  output.classList.add("vp-range-double-output");
  form.appendChild(output);

  el.appendChild(form);

  // 6. Función de actualización
  const update = () => {
    const v1 = parseFloat(inputMin.value);
    const v2 = parseFloat(inputMax.value);

    // Ordenar valores
    const vMin = Math.min(v1, v2);
    const vMax = Math.max(v1, v2);

    // Calcular porcentajes para la barra
    const range = max - min;
    const left = ((vMin - min) / range) * 100;
    const width = ((vMax - vMin) / range) * 100;

    // Actualizar CSS del track fill
    trackFill.style.marginLeft = `${left}%`;
    trackFill.style.width = `${width}%`;

    // Determinar decimales según el step
    const decimals = step < 1 ? String(step).split(".")[1]?.length ?? 1 : 0;

    // Actualizar texto del output
    output.textContent = `${vMin.toFixed(decimals)} - ${vMax.toFixed(decimals)}`;

    // Sincronizar con Python (usando fromValue y toValue separados)
    model.set("fromValue", vMin);
    model.set("toValue", vMax);
    model.save_changes();
  };

  // 7. Event listeners
  inputMin.addEventListener("input", update);
  inputMax.addEventListener("input", update);

  // 8. Función auxiliar para clampear valores dentro de los límites
  const clamp = (value: number, minVal: number, maxVal: number): number => {
    return Math.max(minVal, Math.min(maxVal, value));
  };

  // 9. Escuchar cambios desde Python
  model.on("change:fromValue", () => {
    let modelValuefrom: number = model.get("fromValue");
    if (typeof modelValuefrom === "number") {
      // Clampear el valor dentro de los límites
      const clampedValue = clamp(modelValuefrom, min, max);
      
      // Si el valor fue clampeado, actualizar el modelo
      if (clampedValue !== modelValuefrom) {
        model.set("fromValue", clampedValue);
        model.save_changes();
        modelValuefrom = clampedValue;
      }
      
      const newMin = modelValuefrom;
      
      // Evitar bucles infinitos: solo actualizar si es diferente
      if (parseFloat(inputMin.value) !== newMin) {
        inputMin.value = String(newMin);
      }

      // Recalcular la visualización
      const range = max - min;
      const vMin = Math.min(newMin, parseFloat(inputMax.value));
      const vMax = Math.max(newMin, parseFloat(inputMax.value));
      const left = ((vMin - min) / range) * 100;
      const width = ((vMax - vMin) / range) * 100;
      
      trackFill.style.marginLeft = `${left}%`;
      trackFill.style.width = `${width}%`;

      const decimals = step < 1 ? String(step).split(".")[1]?.length ?? 1 : 0;
      output.textContent = `${vMin.toFixed(decimals)} - ${vMax.toFixed(decimals)}`;
    }
  });
  model.on("change:toValue", () => {
    let modelValueTo: number = model.get("toValue");
    if (typeof modelValueTo === "number") {
      // Clampear el valor dentro de los límites
      const clampedValue = clamp(modelValueTo, min, max);
      
      // Si el valor fue clampeado, actualizar el modelo
      if (clampedValue !== modelValueTo) {
        model.set("toValue", clampedValue);
        model.save_changes();
        modelValueTo = clampedValue;
      }
      
      const newMax = modelValueTo;
      if (parseFloat(inputMax.value) !== newMax) {
        inputMax.value = String(newMax);
      }
        const range = max - min;
        const vMin = Math.min(parseFloat(inputMin.value), newMax);
        const vMax = Math.max(parseFloat(inputMin.value), newMax);
        const left = ((vMin - min) / range) * 100;
        const width = ((vMax - vMin) / range) * 100;
        
        trackFill.style.marginLeft = `${left}%`;
        trackFill.style.width = `${width}%`;
        const decimals = step < 1 ? String(step).split(".")[1]?.length ?? 1 : 0;
        output.textContent = `${vMin.toFixed(decimals)} - ${vMax.toFixed(decimals)}`;
    }
  });

  // 10. Inicialización
  update();
}

export default {render};