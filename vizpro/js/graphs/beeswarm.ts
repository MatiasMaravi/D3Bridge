import type { RenderProps } from "@anywidget/types";
import * as d3 from "d3";
import "./beeswarm.css";

// Configuración de márgenes y dimensiones por defecto
const MARGIN = { top: 20, right: 20, bottom: 40, left: 30 };
const DEFAULT_WIDTH = 600;//Cambiar a el ancho del widget
const DEFAULT_HEIGHT = 600;


interface BeesWarmModel {
    x_: string; // x-axis column name (categoría)
    y_: string; // y-axis column name (valor numérico)
    hue_?: string; // hue column name (opcional, para agrupar)
    direction_: "vertical" | "horizontal"; // dirección del gráfico
    palette_: string[]; // paleta de colores para las barras
    data: any[]; // Array de objetos de datos
}

function render({model, el}: RenderProps<BeesWarmModel>) {
    // Limpiar el contenedor antes de renderizar
    d3.select(el).selectAll("*").remove();
}


export default {render}
