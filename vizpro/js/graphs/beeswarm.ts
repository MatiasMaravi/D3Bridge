import type { RenderProps } from "@anywidget/types";
import * as d3 from "d3";
import "./beeswarm.css";

// Configuración de márgenes y dimensiones por defecto
const MARGIN = { top: 20, right: 20, bottom: 40, left: 30 };
const DEFAULT_WIDTH = 800;//Cambiar a el ancho del widget
const DEFAULT_HEIGHT = 600;

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
    data: any[];
    base_value: number;
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
class BeesWarm {
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
        const all_values = this.data.reduce((acc: number[], d) => acc.concat(d["values"]), []);
        const [x_min, x_max] = d3.extent(all_values) as [number, number];

        // Escala X usa el nuevo innerWidth
        const x_scale = d3.scaleLinear()
            .domain([x_min, x_max])
            .nice()
            .range([0, innerWidth]);

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
            .attr("class", "vp-beeswarm");

        // 5. APLICAR EL MARGEN DINÁMICO AL GRUPO PRINCIPAL
        const g = svg.append("g")
            .attr("transform", `translate(${dynamicMarginLeft},${MARGIN.top})`);

        g.append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(x_scale));

        // 6. EJE Y "LIMPIO"
        // Ya no necesitas translates raros. El eje va en el origen (0,0) del grupo g.
        // D3 alinea el texto a la derecha del eje automáticamente (text-anchor: end).
        g.append("g")
            .call(d3.axisLeft(y_scale));

        // Horizontal dashed lines for each feature
        g.selectAll(".feature-line")
            .data(this.data)
            .enter()
            .append("path")
            .attr("class", "feature-line")
            .attr("stroke", "grey")
            .attr("stroke-dasharray", "2,2")
            .attr("d", (d) => {
                const yPos = y_scale(d["feature_names"]);
                if (yPos === undefined) return "";
                return d3.line()([
                    [x_scale.range()[0], yPos + y_scale.bandwidth() / 2],
                    [x_scale.range()[1], yPos + y_scale.bandwidth() / 2]
                ]);
            });

        // Vertical line at x=0
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

        let scatter_data: any = {};

        const data_size = this.data[0]["values"].length;

        let force_value = 1;

        if (data_size < 50) {
            force_value = 3;
        }else if (data_size < 300) {
            force_value = 2;
        }

        this.data.forEach((d,i) => {
            const nodes: {value: number, x?: number, y?: number, color?: number}[] = d["values"].map((v: number) => ({value:v}));

            const simulation = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
                    .force("x",d3.forceX((node: any) => x_scale((node as {value: number}).value)).strength(1))
                    .force("y",d3.forceY(y_scale(d["feature_names"])! + y_scale.bandwidth() / 2).strength(1))
                    .force("collide",d3.forceCollide(force_value))
                    .stop();

            simulation.tick(50);

            const extentResult = d3.extent(d["data"] as number[]) as [number, number];
            const color_domain_min = extentResult[0];
            const color_domain_max = extentResult[1];

            nodes.forEach((d,j) => {
                const value = this.data[i]["data"][j];

                let lineXScalePercentage = (value - color_domain_min) / (color_domain_max - color_domain_min);

                if(isNaN(lineXScalePercentage)){
                    lineXScalePercentage = 0;
                }
                d["color"] = lineXScalePercentage;
            });
            scatter_data[d["feature_names"]] = nodes;
        });
        const all_paths: any[] = [];
        const all_dots: any[] = [];
        const selectedPaths: any[] = [];

        const call_update_selected = (indexes: number[]) => {
            all_paths.forEach((path) => {
                if(indexes.includes(path.data()[0][0].index)){
                    path.attr("visibility", "visible");
                }else{
                    path.attr("visibility", "hidden");
                }
            });
            const filteredData:any[] = this.data.map((d) => {
                return {
                    "feature_names": d["feature_names"],
                    "values": indexes.map((i) => d["values"][i]),
                    "data": indexes.map((i) => d["data"][i]),
                    "base_values": this.base_value
                }
            });
            this.set_selected_values(filteredData);
        };

        const dotClick = (event: any, d: any) => {
            const rowIndex = d.row;
            
            // Limpiar selección anterior
            g.selectAll(".beeswarm-dot-selected").remove();
            
            // Ocultar todos los paths
            all_paths.forEach((path) => path.attr("visibility", "hidden"));
            
            // Mostrar el path correspondiente
            if (all_paths[rowIndex]) {
                all_paths[rowIndex].attr("visibility", "visible");
            }

            // Obtener datos de todos los puntos de esta fila
            const selectedData: any[] = g.selectAll("circle.beeswarm-dot-" + rowIndex).data();

            // Agregar círculos más grandes para resaltar con borde blanco
            g.selectAll(null)
                .data(selectedData)
                .enter()
                .append("circle")
                .attr("r", 6)
                .attr("fill", (d: any) => d.color)
                .attr("stroke", "white")
                .attr("stroke-width", "2")
                .attr("cx", (d: any) => d.x)
                .attr("cy", (d: any) => d.scatter_y)
                .attr("class", "beeswarm-dot-selected")
                .attr("pointer-events", "none");

            selectedPaths.length = 0;
            selectedPaths.push(rowIndex);
            call_update_selected(selectedPaths);
        }

        function addPoints(data: any[], scatter_data: any[], i:number,get_color:(value:number)=>string){
            let datum: any[] = [];
            data.forEach((d: any) => {
                const node = scatter_data[d["feature_names"]][i];
                datum.push({
                    x: node.x,
                    scatter_y: node.y,
                    y: y_scale(d["feature_names"])! + y_scale.bandwidth() / 2,
                    color: get_color(node.color!),
                    ["feature_names"]: d["feature_names"],
                    row: i
                });
            });

            let path_datum = [
                {x: x_scale(0), scatter_y: y_scale.range()[0], y: y_scale.range()[0], index : i},
                ...datum,
            ];

            const new_path = g.append("path").datum(path_datum);

            new_path.attr("visibility", "hidden")
                .attr("fill", "none")
                .attr("stroke", "grey")
                .attr("stroke-width", 1)
                .attr("d", d3.line()
                .x((d: any) => d.x)
                .y((d: any) => d.scatter_y)
                )
                .classed("vp-beeswarm-path", true)
                .attr("opacity", 0.4);
            
            all_paths.push(new_path);

            const new_dot = g.selectAll(null).data(datum).enter().append("circle")

            new_dot.attr("r",3)
                .attr("fill", (d: any) => d.color)
                .attr("cx", (d: any) => d.x)
                .attr("cy", (d: any) => d.scatter_y)
                .attr("cursor", "pointer")
                .attr("opacity", 0.7)
                .attr("class",(d:any) => "beeswarm-dot-" + d.row);

            all_dots.push(new_dot);
        }
        for(let i = 0; i < num_lines; i++){
            addPoints(this.data, scatter_data, i, this.get_color);
        }

        let grad = g.append("defs")
            .append("linearGradient")
            .attr("id", "beeswarm-grad-color-gradient")
            .attr("x1", "0%")
            .attr("y1", "100%")
            .attr("x2", "0%")
            .attr("y2", "0%");

        grad.selectAll("stop")
            .data(colors)
            .enter()
            .append("stop")
            .style("stop-color", (d) => `rgb(${d.r},${d.g},${d.b})`)
            .attr("offset", (d, i) => `${(i / (colors.length - 1)) * 100}%`);

        g.append("rect")
            .attr("x", innerWidth + 20)
            .attr("y", 0)
            .attr("width", 10)
            .attr("height", innerHeight)
            .style("fill", "url(#beeswarm-grad-color-gradient)");

        g.append("text")
            .attr("x", innerWidth + 40)
            .attr("y", 10)
            .text("High");

        g.append("text")
            .attr("x", innerWidth + 40)
            .attr("y", innerHeight)
            .text("Low");

        g.append("text")
            .attr("x", y_scale.range()[0] / 2 - 50)
            .attr("y", -x_scale.range()[1] - 50)
            .attr("transform", "rotate(90)")
            .text("Feature Value");

        all_dots.forEach((dot) => dot.on("click",dotClick).attr("cursor", "pointer"));

        const references_lines = g.selectAll().data(this.data).enter().append("path");

        references_lines.attr("visibility", "hidden")
            .attr("stroke", "white")
            .attr("stroke-width", 5)
            .attr("stroke-opacity", 0)
            .attr("d", (d: any) => {
                return d3.line()([
                    [x_scale.range()[0], y_scale(d["feature_names"])! + y_scale.bandwidth() / 2],
                    [x_scale.range()[1], y_scale(d["feature_names"])! + y_scale.bandwidth() / 2]
                ]);
            });
    }
}

function render({ model, el }: RenderProps<BeesWarmModel>) {
    // Limpiar el contenedor antes de renderizar
    let beeswarm = new BeesWarm(el, model);
    beeswarm.render();
    model.on("change:data", () => {
        beeswarm.render();
    });
    model.on("change:base_value", () => {
        beeswarm.render();
    });
}


export default { render }
