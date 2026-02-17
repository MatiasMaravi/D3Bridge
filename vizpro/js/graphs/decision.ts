import type { RenderProps } from "@anywidget/types";
import * as d3 from "d3";
import { MARGIN, colors, absoluteSort, getTextWidth, get_color, ShapPlot } from "./shap_plot";
import type { ShapModel, ShapRecord, PathPoint } from "./shap_plot";
import "./decision.css";

class Decision extends ShapPlot {
    private get_domain(data: ShapRecord[], base_value: number) {
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

    public render() {
        // 1. Limpieza previa
        d3.select(this.el).selectAll("*").remove();

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

        const x_domain = this.get_domain(data, base_value);
        const x_scale = d3.scaleLinear().domain(x_domain).range([0, innerWidth]).nice();
        const y_domain = data.map((d) => d["feature_names"]);
        const y_scale = d3.scaleBand()
            .domain(y_domain)
            .range([innerHeight, 0])
            .padding(0.2);

        const num_lines = data[0]["values"].length;

        const svg = d3.select(this.el)
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height);
        
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
            .data(data)
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
            .attr("height", 30)
            .style("fill", "url(#decision-grad-color-gradient)");

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

        const addPath = (_data: ShapRecord[], i: number) => {
            let path_point = base_value;
            const datum: PathPoint[] = [{"x": x_scale(path_point), "y": y_scale.range()[0], "index": i}];
            data.forEach((d: ShapRecord) => {
                path_point += d["values"][i];
                datum.push({"x": x_scale(path_point), "y": y_scale(d["feature_names"])!, "feature_names": d["feature_names"]});
            });

            const line_x_scale_percentage = x_scale(path_point) / x_scale.range()[1];

            const new_path = g.append<SVGPathElement>("path").datum(datum);

            new_path.attr("fill", "none")
                .attr("stroke", get_color(line_x_scale_percentage))
                .attr("stroke-width", 2)
                .attr("d", d3.line<PathPoint>().x((d) => d.x).y((d) => d.y))
                .classed("decision-path", true)
                .attr("opacity", 0.4);
            
            this.all_paths.push(new_path);
        }

        for (let i = 0; i < num_lines; i++){
            addPath(data, i);
        }

        const reference_lines = g.selectAll().data(data).enter().append("path");

        reference_lines.attr("visibility", "hidden")
            .attr("stroke", "white")
            .attr("stroke-width", 5)
            .attr("stroke-opacity", 0)
            .attr("d", (d) => d3.line()([
                [x_scale.range()[0], y_scale(d["feature_names"])!],
                [x_scale.range()[1], y_scale(d["feature_names"])!]
            ]));
        
        const PathClick = (_event: MouseEvent, d: PathPoint[]) => {
            if (d[0].index !== undefined) {
                this.selected_paths.push(d[0].index);
                this.call_update_selected(data, base_value);
            }
        }
        this.all_paths.forEach((path) => path.on("click",PathClick).attr("cursor", "pointer"));
    }
}

function render({ model, el }: RenderProps<ShapModel>) {
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
