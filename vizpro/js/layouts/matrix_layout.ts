import type { Render } from "@anywidget/types";
import "./layouts.css";

// Helper para extraer ID de modelos IPY Widgets (vienen como strings "IPY_MODEL_..." o objetos)
function extractModelId(item: any): string | null {
    if (typeof item === "string") {
        return item.replace("IPY_MODEL_", "");
    }
    if (item && typeof item === "object" && "model_id" in item) {
        return item.model_id;
    }
    return null;
}

const render: Render = ({ model, el }) => {
    const gridContainer = document.createElement("div");
    gridContainer.style.display = "grid";
    gridContainer.style.height = "100%";
    gridContainer.style.width = "100%";
    gridContainer.style.gap = "5px";
    
    // Configurar grid inicial
    gridContainer.style.gridTemplateAreas = model.get("grid_template_areas");
    gridContainer.style.gridAutoRows = "1fr"; 
    gridContainer.style.gridAutoColumns = "1fr";

    // Función para manejar el estilo (tema)
    const updateStyle = () => {
        const style = model.get("style") || "basic";
        gridContainer.className = style; 
    };

    el.appendChild(gridContainer);
    
    // Cache de vistas para no regenerarlas
    const childViews = new Map<string, any>();
    
    // --- CORRECCIÓN: Definir wrapperRefs aquí ---
    const wrapperRefs = new Map<string, HTMLElement>();

    async function updateLayout() {
        gridContainer.style.gridTemplateAreas = model.get("grid_template_areas");

        const children = model.get("children") || [];
        const widgetAreas = model.get("widget_areas") || {};
        const currentIds = new Set<string>();

        // 1. Crear/Actualizar vistas
        for (const child of children) {
            const modelId = extractModelId(child);
            if (!modelId) continue;
            
            currentIds.add(modelId);
            
            let wrapper = gridContainer.querySelector(`[data-widget-id="${modelId}"]`) as HTMLElement;
            const areaName = widgetAreas[modelId];

            if (!wrapper) {
                // Nuevo widget
                wrapper = document.createElement("div");
                wrapper.classList.add("vp-dashboard-div"); 
                wrapper.dataset.widgetId = modelId;
                wrapper.style.overflow = "auto"; 
                gridContainer.appendChild(wrapper);
                
                // --- CORRECCIÓN: Guardar referencia ---
                wrapperRefs.set(modelId, wrapper);

                try {
                    // Usar el widget manager del modelo anywidget
                    const childModel = await model.widget_manager.get_model(modelId);
                    
                    if (childModel) {
                        const view = await model.widget_manager.create_view(childModel);
                        childViews.set(modelId, view);
                        wrapper.appendChild(view.el);
                        
                        // NOTA: Se han eliminado los listeners manuales de 'change' y 'click' (Reverse Bridge).
                        // El widget hijo (Checkbox) ya tiene su propia lógica para actualizar el modelo
                        // (model.save_changes). Tenerlos aquí duplicaba las peticiones al backend.
                    }
                } catch (err) {
                    console.error("Error creating view for", modelId, err);
                }
            }
            
            // Asignar al grid-area correspondiente
            if (areaName) {
                wrapper.style.gridArea = areaName;
                wrapper.style.display = "block";
            } else {
                wrapper.style.display = "none";
            }
        }

        // 2. Limpiar vistas antiguas
        for (const [id, view] of childViews.entries()) {
            if (!currentIds.has(id)) {
                // Remover del DOM
                const wrapper = gridContainer.querySelector(`[data-widget-id="${id}"]`);
                if (wrapper) wrapper.remove();
                
                // Limpiar referencia de Backbone/Jupyter
                view.remove();
                childViews.delete(id);
                // --- CORRECCIÓN: Limpiar referencia ---
                wrapperRefs.delete(id);
            }
        }
    }
    
    // Función para aplicar cambios recibidos por mensaje custom
    function applyCustomUpdate(modelId: string, trait: string, value: any) {
        const wrapper = wrapperRefs.get(modelId);
        if (!wrapper) return;

        // Logs opcionales
        console.log(`[MatrixLayout Bridge] Update received:`, modelId, trait, value);

        if (trait === "checked") {
            const checkbox = wrapper.querySelector('input[type="checkbox"]') as HTMLInputElement;
            // Verificación crítica para evitar bucles con el send_state de Python
            if (checkbox && checkbox.checked !== value) {
                checkbox.checked = value;
            }
        } else if (trait === "description") {
            const label = wrapper.querySelector('.vp_checkbox_label');
            if (label) label.textContent = value;
            
            const button = wrapper.querySelector('.vp_button'); // Ajustado para buscar mejor
            if (button) button.textContent = value;
        } else if (trait === "disabled") {
            const el = wrapper.querySelector('input, button') as HTMLInputElement;
            if (el) el.disabled = value;
        }
    }

    // Suscribirse al canal de mensajes personalizados (El "Puente")
    model.on("msg:custom", (msg: any) => {
        if (msg.type === "child_change") {
            applyCustomUpdate(msg.model_id, msg.trait, msg.value);
        }
    });

    // Suscripciones
    model.on("change:children", updateLayout);
    model.on("change:widget_areas", updateLayout);
    model.on("change:style", updateStyle); 
    model.on("change:grid_template_areas", () => {
        gridContainer.style.gridTemplateAreas = model.get("grid_template_areas");
    });
    
    // Render inicial
    updateStyle();
    updateLayout();

    return () => {
        // Cleanup al destruir el widget
        for (const view of childViews.values()) {
            view.remove();
        }
        gridContainer.remove();
        wrapperRefs.clear();
    };
};

export default { render };