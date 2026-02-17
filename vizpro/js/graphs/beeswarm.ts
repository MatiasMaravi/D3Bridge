import type { RenderProps } from "@anywidget/types";
import * as d3 from "d3";
import { MARGIN, colors, absoluteSort,getTextWidth,get_color,ShapPlot,ShapModel, ShapRecord } from "./shap_plot";
import "./beeswarm.css";

interface BeeswarmNode {
    value: number;
    x?: number;
    y?: number;
    color?: number;
}

interface BeeswarmDatum {
    x: number;
    y: number;
    color: string;
    feature_names: string;
    row: number;
}

interface BeeswarmPathDatum {
    x: number;
    y: number;
    index?: number;
    feature_names?: string;
}

class BeesWarm extends ShapPlot {
    public render() {
        d3.select(this.el).selectAll("*").remove();
        this.all_paths = [];
        this.selected_paths = [];

        const data = this.model.get("data");
        const base_value = this.model.get("base_value");

        const maxTextWidth = d3.max(data, (d) =>
            getTextWidth(d["feature_names"])
        ) || 0;

        const dynamicMarginLeft = Math.max(50, maxTextWidth + 20);

        const gradientBarSpace = 80;
        const innerWidth = this.width - dynamicMarginLeft - MARGIN.right - gradientBarSpace;
        const innerHeight = this.height - MARGIN.top - MARGIN.bottom;

        data.sort(absoluteSort("values", true));
        const all_values = data.reduce((acc: number[], d) => acc.concat(d["values"]), []);
        const [x_min, x_max] = d3.extent(all_values) as [number, number];

        const x_scale = d3.scaleLinear()
            .domain([x_min, x_max])
            .nice()
            .range([0, innerWidth]);

        const y_domain = data.map((d) => d["feature_names"]);
        const y_scale = d3.scaleBand()
            .domain(y_domain)
            .range([innerHeight, 0])
            .padding(0.2);

        const num_lines = data[0]["values"].length;

        const svg = d3.select(this.el)
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("class", "vp-beeswarm");

        const g = svg.append("g")
            .attr("transform", `translate(${dynamicMarginLeft},${MARGIN.top})`);

        g.append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(x_scale));

        g.append("g")
            .call(d3.axisLeft(y_scale));

        g.selectAll(".feature-line")
            .data(data)
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

        const lastFeature = data.length > 0 ? data[data.length - 1]["feature_names"] : null;
        
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

        const scatter_data: Record<string, BeeswarmNode[]> = {};

        const data_size = data[0]["values"].length;

        let force_value = 1;

        if (data_size < 50) {
            force_value = 3;
        }else if (data_size < 300) {
            force_value = 2;
        }

        data.forEach((d,i) => {
            const nodes: BeeswarmNode[] = d["values"].map((v: number) => ({value:v}));

            const simulation = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
                    .force("x",d3.forceX((node) => x_scale((node as {value: number}).value)).strength(1))
                    .force("y",d3.forceY(y_scale(d["feature_names"])! + y_scale.bandwidth() / 2).strength(1))
                    .force("collide",d3.forceCollide(force_value))
                    .stop();

            simulation.tick(50);

            const extentResult = d3.extent(d["data"] as number[]) as [number, number];
            const color_domain_min = extentResult[0];
            const color_domain_max = extentResult[1];

            nodes.forEach((d,j) => {
                const value = data[i]["data"][j];

                let lineXScalePercentage = (value - color_domain_min) / (color_domain_max - color_domain_min);

                if(isNaN(lineXScalePercentage)){
                    lineXScalePercentage = 0;
                }
                d["color"] = lineXScalePercentage;
            });
            scatter_data[d["feature_names"]] = nodes;
        });
        const all_dots: d3.Selection<SVGCircleElement, BeeswarmDatum, SVGGElement, unknown>[] = [];

        const dotClick = (_event: MouseEvent, d: BeeswarmDatum) => {
            const rowIndex = d.row;
            
            g.selectAll(".beeswarm-dot-selected").remove();
            
            this.all_paths.forEach((path) => path.attr("visibility", "hidden"));
            
            if (this.all_paths[rowIndex]) {
                this.all_paths[rowIndex].attr("visibility", "visible");
            }

            const selectedData = g.selectAll<SVGCircleElement, BeeswarmDatum>("circle.beeswarm-dot-" + rowIndex).data();

            g.selectAll(null)
                .data(selectedData)
                .enter()
                .append("circle")
                .attr("r", 6)
                .attr("fill", (d: BeeswarmDatum) => d.color)
                .attr("stroke", "white")
                .attr("stroke-width", "2")
                .attr("cx", (d: BeeswarmDatum) => d.x)
                .attr("cy", (d: BeeswarmDatum) => d.y)
                .attr("class", "beeswarm-dot-selected")
                .attr("pointer-events", "none");

            this.selected_paths.length = 0;
            this.selected_paths.push(rowIndex);
            this.call_update_selected(data, base_value);
        }

        const addPoints = (data: ShapRecord[], scatter_data: Record<string, BeeswarmNode[]>, i: number) => {
            const datum: BeeswarmDatum[] = [];
            data.forEach((d: ShapRecord) => {
                const node = scatter_data[d["feature_names"]][i];
                datum.push({
                    x: node.x!,
                    y: node.y!,
                    color: get_color(node.color!),
                    feature_names: d["feature_names"],
                    row: i
                });
            });

            const path_datum: BeeswarmPathDatum[] = [
                {x: x_scale(0), y: y_scale.range()[0], index : i},
                ...datum,
            ];

            const new_path = g.append<SVGPathElement>("path").datum(path_datum);

            new_path.attr("visibility", "hidden")
                .attr("fill", "none")
                .attr("stroke", "grey")
                .attr("stroke-width", 1)
                .attr("d", d3.line<BeeswarmPathDatum>()
                .x((d) => d.x)
                .y((d) => d.y)
                )
                .classed("vp-beeswarm-path", true)
                .attr("opacity", 0.4);
            
            this.all_paths.push(new_path as d3.Selection<SVGPathElement, BeeswarmPathDatum[], null, undefined>);

            const new_dot = g.selectAll(null).data(datum).enter().append<SVGCircleElement>("circle");

            new_dot.attr("r",3)
                .attr("fill", (d: BeeswarmDatum) => d.color)
                .attr("cx", (d: BeeswarmDatum) => d.x)
                .attr("cy", (d: BeeswarmDatum) => d.y)
                .attr("cursor", "pointer")
                .attr("opacity", 0.7)
                .attr("class", (d: BeeswarmDatum) => "beeswarm-dot-" + d.row);

            all_dots.push(new_dot);
        }
        for(let i = 0; i < num_lines; i++){
            addPoints(data, scatter_data, i);
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
            .attr("offset", (_d, i) => `${(i / (colors.length - 1)) * 100}%`);

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

        const references_lines = g.selectAll().data(data).enter().append("path");

        references_lines.attr("visibility", "hidden")
            .attr("stroke", "white")
            .attr("stroke-width", 5)
            .attr("stroke-opacity", 0)
            .attr("d", (d: ShapRecord) => {
                return d3.line()([
                    [x_scale.range()[0], y_scale(d["feature_names"])! + y_scale.bandwidth() / 2],
                    [x_scale.range()[1], y_scale(d["feature_names"])! + y_scale.bandwidth() / 2]
                ]);
            });
    }
}

function render({ model, el }: RenderProps<ShapModel>) {
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
