import type { RenderProps } from "@anywidget/types";
import * as d3 from "d3";
import "./beeswarm.css";

// Configuración de márgenes y dimensiones por defecto
const MARGIN = { top: 20, right: 20, bottom: 40, left: 30 };
const DEFAULT_WIDTH = 600;//Cambiar a el ancho del widget
const DEFAULT_HEIGHT = 600;

const GRAD_BAR_WIDTH = 150;

const colors = [
  { r: 17, g: 102, b: 255 },
  { r: 255, g: 51, b: 51 },
];

function absoluteSort(property: string, ascending: boolean) {
  function arrayAbsSum(array: number[]) {
    let sum = 0;
    array.forEach((i) => (sum += Math.abs(i)));
    return sum;
  }

  let order = 1;
  if (ascending) order = -1;
  var sortOrder = 1;
  if (property[0] === "-") {
    sortOrder = -1;
    property = property.substring(1);
  }
  return function (a: any, b: any) {
    var result =
      arrayAbsSum(a[property]) < arrayAbsSum(b[property])
        ? order
        : arrayAbsSum(a[property]) > arrayAbsSum(b[property])
        ? order * -1
        : 0;
    return result * sortOrder;
  };
}

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
    let data = model.get("data");
    let x_value = model.get("x_");
    let y_value = model.get("y_");
    let width = el.clientWidth || DEFAULT_WIDTH;
    let height = el.clientHeight || DEFAULT_HEIGHT;
    data.sort(absoluteSort(x_value, true));

    const all_values = data.reduce((acc: number[], d) => acc.concat(d[x_value]), []);

    const [x_min, x_max] = d3.extent(all_values) as [number, number];

    const x_scale = d3.scaleLinear()
        .domain([x_min, x_max])
        .nice()
        .range([GRAD_BAR_WIDTH, width - GRAD_BAR_WIDTH - MARGIN.left - MARGIN.right]);

    const y_domain = data.map((d) => d[y_value]);
    const y_scale = d3.scaleBand()
        .domain(y_domain)   
        .range([height-MARGIN.top-MARGIN.bottom, 0])
        .padding(0.2);

    //Plot Axes
    const svg = d3.select(el)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("class", "vp-beeswarm");

    const g = svg.append("g")
        .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
    g.append("g")
        .attr("transform", `translate(0,${height - MARGIN.top - MARGIN.bottom})`)
        .call(d3.axisBottom(x_scale));
    g.append("g")
        .call(d3.axisLeft(y_scale));

        
}


export default {render}
