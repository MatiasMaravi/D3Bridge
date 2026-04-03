import type { RenderProps} from "@anywidget/types";
import "./layouts.css";

interface MatrixLayoutModel {
    grid_template_areas: string;
    widget_areas: Record<string, string>;
    style: string;
    children: any[];
    matrix: number[][];
}

async function render({ model, el }: RenderProps<MatrixLayoutModel>) {
    const node = document.createElement("div");
    const matrix = model.get("matrix");
    const style = model.get("style") || "basic";

    const numRows = matrix.length;
    const numCols = matrix[0].length;

    node.classList.add(style);
    node.style.display = "grid";
    node.style.gridTemplateAreas = model.get("grid_template_areas");
    node.style.gridTemplateRows = "repeat(" + numRows + ", 180px)";
    node.style.gridTemplateColumns = "repeat(" + numCols + ", 1fr)";
    node.style.width = "100%";
    
    console.log(model.get("grid_template_areas"));

    // Función para manejar el estilo (tema)
    const updateStyle = () => {
        const style = model.get("style") || "basic";
        node.className = style; 
    };


    async function updateLayout() {
        // Limpiar el contenedor antes de renderizar para evitar duplicados
        node.innerHTML = "";

        const children = model.get("children") || [];
        const widgetAreas = model.get("widget_areas") || {};
        
        // Crear array de promesas para renderizar en paralelo
        const promises = children.map(async (child: any) => {
            const modelId = child.slice("IPY_MODEL_".length);
            const areaName = widgetAreas[modelId];

            // Nuevo widget
            const grid_area = document.createElement("div");
            grid_area.setAttribute("id", modelId);
            grid_area.style.gridArea = areaName || "none";
            grid_area.classList.add("vp-dashboard-div");

            // Agregar al DOM antes de crear la vista para que tenga dimensiones reales
            node.appendChild(grid_area);

            try {
                // Usar el widget manager del modelo anywidget (Asíncrono)
                const childModel = await model.widget_manager.get_model(modelId);
                console.log("Creating view for", modelId, childModel);
                if (childModel) {
                    const view = await model.widget_manager.create_view(childModel);
                    grid_area.appendChild(view.el);
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
        node.style.gridTemplateAreas = model.get("grid_template_areas");
    });
    
    // Render inicial
    updateStyle();
    el.appendChild(node);
    await updateLayout();
    return () => {
        node.remove();
    };
}

export default { render };