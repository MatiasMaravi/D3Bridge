import type { RenderProps} from "@anywidget/types";
import "./layouts.css";

interface MatrixLayoutModel {
    grid_template_areas: string;
    widget_areas: Record<string, string>;
    style: string;
    children: any[];
}

async function render({ model, el }: RenderProps<MatrixLayoutModel>) {
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
    

    async function updateLayout() {
        // Limpiar el contenedor antes de renderizar para evitar duplicados
        gridContainer.innerHTML = "";
        
        gridContainer.style.gridTemplateAreas = model.get("grid_template_areas");

        const children = model.get("children") || [];
        const widgetAreas = model.get("widget_areas") || {};
        
        // Crear array de promesas para renderizar en paralelo
        const promises = children.map(async (child: any) => {
            const modelId = child.slice("IPY_MODEL_".length);
            const areaName = widgetAreas[modelId];

            // Nuevo widget
            const wrapper = document.createElement("div");
            wrapper.classList.add("vp-dashboard-div"); 
            wrapper.dataset.widgetId = modelId;
            
            wrapper.style.minHeight = "0"; 
            wrapper.style.minWidth = "0";
                
            wrapper.style.height = "100%";
            wrapper.style.width = "100%";

            wrapper.style.overflow = "hidden"; 
            
            // Asignar al grid-area correspondiente
            if (areaName) {
                wrapper.style.gridArea = areaName;
                wrapper.style.display = "block";
            } else {
                wrapper.style.display = "none";
            }

            // Agregar al DOM inmediatamente (sincrónico) para mantener el orden
            gridContainer.appendChild(wrapper);

            try {
                // Usar el widget manager del modelo anywidget (Asíncrono)
                const childModel = await model.widget_manager.get_model(modelId);
                console.log("Creating view for", modelId, childModel);
                if (childModel) {
                    const view = await model.widget_manager.create_view(childModel);
                    wrapper.appendChild(view.el);
                }
            } catch (err) {
                console.error("Error creating view for", modelId, err);
            }
        });

        // Esperar a que todas las vistas se carguen
        await Promise.all(promises);
    }

    // Suscripciones
    model.on("change:children", updateLayout);
    model.on("change:widget_areas", updateLayout);
    model.on("change:style", updateStyle); 
    model.on("change:grid_template_areas", () => {
        gridContainer.style.gridTemplateAreas = model.get("grid_template_areas");
    });
    
    // Render inicial
    updateStyle();
    await updateLayout();

    return () => {
        gridContainer.remove();
    };
}

export default { render };