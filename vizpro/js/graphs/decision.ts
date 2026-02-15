import type { RenderProps } from "@anywidget/types";
import * as d3 from "d3";
import "./decision.css";

const colors = [
    { r: 17, g: 102, b: 255 },
    { r: 255, g: 51, b: 51 },
];
const MARGIN = { top: 20, right: 20, bottom: 40, left: 30 };
const DEFAULT_WIDTH = 800;//Cambiar a el ancho del widget
const DEFAULT_HEIGHT = 600;

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
// Helper para medir texto sin renderizarlo en el DOM (muy rápido)
function getTextWidth(text: string, fontSize: string = "12px", fontFamily: string = "sans-serif") {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (context) {
        context.font = `${fontSize} ${fontFamily}`;
        return context.measureText(text).width;
    }
    return 0;
}
interface DecisionModel {
    data: any[];
    base_value: number;
}

class Decision {
    private el: HTMLElement;
    private model: any;
    private data!: any[];
    private base_value!: number;
    private width: number;
    private height: number;
    private resizeObserver: ResizeObserver;

    constructor(el: HTMLElement, model: any) {
        this.el = el;
        this.model = model;
        this.data = model.get("data");
        this.base_value = model.get("base_value");

        // Inicializar ancho y alto
        this.width = this.el.clientWidth || DEFAULT_WIDTH;
        this.height = DEFAULT_HEIGHT;

        // Configurar ResizeObserver
        this.resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const newWidth = entry.contentRect.width;
                // Verificamos que el ancho haya cambiado realmente y sea válido
                if (newWidth > 0 && Math.abs(newWidth - this.width) > 5) {
                    this.width = newWidth;
                    this.render(); // Redibujar
                }
            }
        });

        // Iniciar observación
        this.resizeObserver.observe(this.el);
    }
    private get_domain(data: any[], base_value: number) {
        function get_min_max(i:number){
            let min = base_value;
            let max = base_value;
            let current_value = base_value;

            data.forEach((d) => {
                current_value += d["values"][i];
                if (current_value < min) min = current_value;
                if (current_value > max) max = current_value;
            });
            return [min, max];
        }
        let min = base_value;
        let max = base_value;

        const num_lines = data[0]["values"].length;
        const error_margin = 0.02;

        for(let i = 0; i < num_lines; i++){
            const [line_min, line_max] = get_min_max(i);
            if(line_min < min) min = line_min;
            if(line_max > max) max = line_max;
        }

        if(max - base_value > base_value - min){
            min = 2*base_value - max;
        }else{
            max = 2*base_value - min;
        }

        const range = max - min;
        min -= error_margin * range;
        max += error_margin * range;

        return [min, max];
    }
    private set_selected_values(values: number[]) {
        this.model.set("selected_values_records", values);
        this.model.save_changes();
    }
    private get_color(value:number):string{
        return [
            "rgb(",
            value * colors[1].r + (1 - value) * colors[0].r,
            ",",
            value * colors[1].g + (1 - value) * colors[0].g,
            ",",
            value * colors[1].b + (1 - value) * colors[0].b,
            ")"
        ].join("");
    }
    public render() {
        // 1. Limpieza previa
        d3.select(this.el).selectAll("*").remove();

        // 2. CONFIGURACIÓN DE FUENTE (Debe coincidir con tu CSS .vp-beeswarm text)
        const fontSize = "12px";
        const fontFamily = "sans-serif";

        // 3. CALCULAR EL MARGEN IZQUIERDO DINÁMICO
        // Buscamos el ancho máximo real en píxeles de todas las features
        const maxTextWidth = d3.max(this.data, (d) =>
            getTextWidth(d["feature_names"], fontSize, fontFamily)
        ) || 0;

        // El margen izquierdo será el texto más largo + un padding (ej. 10px)
        // Ponemos un mínimo de 50px por si acaso los textos son vacíos
        const dynamicMarginLeft = Math.max(50, maxTextWidth + 20);

        // 4. Recalcular el ancho disponible para el gráfico (reservar espacio para la barra de gradiente)
        const gradientBarSpace = 80;
        const innerWidth = this.width - dynamicMarginLeft - MARGIN.right - gradientBarSpace;
        const innerHeight = this.height - MARGIN.top - MARGIN.bottom;

        // --- A PARTIR DE AQUÍ TODO NORMAL ---

        this.data.sort(absoluteSort("values", true));

        const x_domain = this.get_domain(this.data, this.base_value);
        const x_scale = d3.scaleLinear().domain(x_domain).range([0, innerWidth]).nice();
        const y_domain = this.data.map((d) => d["feature_names"]);
        const y_scale = d3.scaleBand()
            .domain(y_domain)
            .range([innerHeight, 0])
            .padding(0.2);

        const num_lines = this.data[0]["values"].length;

        const svg = d3.select(this.el)
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("class", "vp-decision");
        
        const g = svg.append("g")
            .attr("transform", `translate(${dynamicMarginLeft},${MARGIN.top})`);

        g.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(x_scale));

        g.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(y_scale));

        // Dibujar líneas
        g.selectAll(".feature-line")
            .data(this.data)
            .enter()
            .append("path")
            .attr("class", "feature-line")
            .attr("stroke", "grey")
            .attr("stroke-dasharray", "2,2")
            .attr("d", (d) => d3.line()([
                [x_scale.range()[0], y_scale(d["feature_names"])!],
                [x_scale.range()[1], y_scale(d["feature_names"])!]
            ])
        );

        let grad = g.append("defs")
            .append("linearGradient")
            .attr("id", "decision-grad-color-gradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "100%")
            .attr("y2", "0%");

        grad.selectAll("stop")
            .data(colors)
            .enter()
            .append("stop")
            .style("stop-color", (d) => `rgb(${d.r},${d.g},${d.b})`)
            .attr("offset", (d, i) => `${(i / (colors.length - 1)) * 100}%`);

        g.append("rect")
            .attr("x", x_scale.range()[0])
            .attr("y", -20)
            .attr("width", x_scale.range()[1])
            .attr("height", 20)
            .style("fill", "url(#decision-grad-color-gradient)");

        const lastFeature = this.data.length > 0 ? this.data[this.data.length - 1]["feature_names"] : null;
        
        if (lastFeature !== null) {
            g.append("path")
                .attr("fill", "none")
                .attr("stroke", "grey")
                .attr("stroke-width", 2)
                .attr("d", d3.line()([
                    [x_scale(0), y_scale.range()[0]],
                    [x_scale(0), y_scale(lastFeature)!]
                ]));
        }
        

        const allPaths: any[] = [];
        const selectedPaths: any[] = [];

        const callUpdateSelected = (indexes: number[]) => {
            allPaths.forEach((path) => path.classed("selected",indexes.includes(path.data()[0][0].index)));
            const filteredData:any[] = this.data.map((d) => {
                return {
                    "feature_names": d["feature_names"],
                    "values": indexes.map((i) => d["values"][i]),
                    "data": indexes.map((i) => d["data"][i]),
                    "base_values": this.base_value
                }
            });
            this.set_selected_values(filteredData);
        }

        const addPath = (d: any, i: number) => {
            let path_point = this.base_value;
            let datum: any[] = [{"x": x_scale(path_point), "y": y_scale.range()[0], "index":i}];
            this.data.forEach((d: any) => {
                path_point += d["values"][i];
                datum.push({"x": x_scale(path_point), "y": y_scale(d["feature_names"])!, "feature_names":d["feature_names"]});
            });

            const line_x_scale_percentage = x_scale(path_point) / x_scale.range()[1];

            const new_path = g.append("path").datum(datum);

            new_path.attr("fill", "none")
                .attr("stroke",this.get_color(line_x_scale_percentage))
                .attr("stroke-width", 2)
                .attr("d", d3.line().x((d:any) => d.x).y((d:any) => d.y) )
                .classed("decision-path", true)
                .attr("opacity",0.4);
            
            allPaths.push(new_path);
        }

        for (let i = 0; i < num_lines; i++){
            addPath(this.data, i);
        }

        const reference_lines = g.selectAll().data(this.data).enter().append("path");

        reference_lines.attr("visibility", "hidden")
            .attr("stroke", "white")
            .attr("stroke-width", 5)
            .attr("stroke-opacity", 0)
            .attr("d", (d) => d3.line()([
                [x_scale.range()[0], y_scale(d["feature_names"])!],
                [x_scale.range()[1], y_scale(d["feature_names"])!]
            ]));
        
        const PathClick = (event: any, d: any) => {
            selectedPaths.push(d[0].index);
            callUpdateSelected(selectedPaths);
        }
        allPaths.forEach((path) => path.on("click",PathClick).attr("cursor", "pointer"));
    }
}

function render({ model, el }: RenderProps<DecisionModel>) {
    // Limpiar el contenedor antes de renderizar
    let decision = new Decision(el, model);
    decision.render();
    model.on("change:data", () => {
        decision.render();
    });
    model.on("change:base_value", () => {
        decision.render();
    });
}


export default { render }
