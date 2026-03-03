import type { AnyModel, RenderProps } from "@anywidget/types";

import * as d3 from "d3";
import "./heatmap.css";

const GRAD_BAR_WIDTH = 100;
const DEFAULT_WIDTH = 600;
const DEFAULT_HEIGHT = 400;
const MARGIN = { top: 20, right: 20, bottom: 50, left: 80 };

function get_color_heatmap(color_domain: [number, number]): d3.ScaleLinear<string, string> {
    const range = ["black", "blue", "red", "white"];
    const domain = [
        color_domain[0],
        color_domain[0] * (2 / 3) + color_domain[1] * (1 / 3),
        color_domain[0] * (1 / 3) + color_domain[1] * (2 / 3),
        color_domain[1],
    ];
    return d3.scaleLinear<string, string>().domain(domain).range(range);
}
interface HeatmapModel {
    data: any[];
    x_name: string;
    y_name: string;
    x_values: string[];
    y_values: string[];
}
class HeatmapPlot {
    protected el!: HTMLElement;
    protected model!: AnyModel<HeatmapModel>;
    protected width: number;
    protected height: number;
    protected resizeObserver: ResizeObserver;

    constructor(el: HTMLElement, model: AnyModel<HeatmapModel>) {
        this.el = el;
        this.model = model;
        this.width = el.clientWidth || DEFAULT_WIDTH;
        this.height = DEFAULT_HEIGHT;

        this.resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const newWidth = entry.contentRect.width;
                if (newWidth > 0 && Math.abs(newWidth - this.width) > 5) {
                    this.width = newWidth;
                    this.render();
                }
            }
        });
        this.resizeObserver.observe(this.el);
    }
    // Prepare Aggregated Data for Bar Plot (mean and standard deviation)
    public render() {
        let x_domain;
        const x_name = this.model.get("x_name");
        const y_name = this.model.get("y_name");
        const x_values = this.model.get("x_values");
        const y_values = this.model.get("y_values");
        const data = this.model.get("data");

        const innerWidth = this.width - MARGIN.left - MARGIN.right - GRAD_BAR_WIDTH;
        const innerHeight = this.height - MARGIN.top - MARGIN.bottom;

        if (x_values) {
            x_domain = x_values;
        } else {
            x_domain = data.reduce((res, row) => {
                if (!res.includes(row[x_name])) {
                    res.push(row[x_name]);
                }
                return res;
            }, [])
                .sort();
        }

        const x_scale = d3.scaleBand().domain(x_domain).range([0, innerWidth]).padding(0.05);

        let y_domain;
        if (y_values) {
            y_domain = y_values;
        } else {
            y_domain = data.reduce((res, row) => {
                if (!res.includes(row[y_name])) {
                    res.push(row[y_name]);
                }
                return res;
            }, [])
                .sort();
        }
        y_domain = y_domain.reverse();

        const y_scale = d3.scaleBand().domain(y_domain).range([innerHeight, 0]).padding(0.05);

        let color_domain = d3.extent(data, function (d) {
            return parseFloat(d["hueValue"]);
        });

        let my_color = get_color_heatmap(color_domain as [number, number]);

        let x_axis = d3.axisBottom(x_scale);
        let y_axis = d3.axisLeft(y_scale);

        d3.select(this.el).selectAll("*").remove();

        // Crear tooltip
        const tooltip = d3.select(this.el)
            .append("div")
            .attr("class", "heatmap-tooltip")
            .style("opacity", 0);

        let svg = d3
            .select(this.el)
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height);

        const g = svg.append("g")
            .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

        g.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(x_axis)
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        g.append("g")
            .attr("class", "y-axis")
            .call(y_axis);

        const rects = g.selectAll(".heatmap-rect")
            .data(data, (d: any) => `${d[x_name]}:${d[y_name]}`)
            .enter()
            .append("rect")
            .attr("class", "heatmap-rect");

        rects.attr("x", (d) => x_scale(d[x_name])!)
            .attr("y", (d) => y_scale(d[y_name])!)
            .attr("width", x_scale.bandwidth())
            .attr("height", y_scale.bandwidth())
            .style("fill", (d) => my_color(parseFloat(d["hueValue"]))!)
            .style("cursor", "pointer")
            .on("mouseover", (event: MouseEvent, d: any) => {
                d3.select(event.currentTarget as SVGRectElement)
                    .style("stroke", "#333")
                    .style("stroke-width", "2px");

                tooltip
                    .style("opacity", 1)
                    .html(`<strong>${x_name}:</strong> ${d[x_name]}<br/><strong>${y_name}:</strong> ${d[y_name]}<br/><strong>Value:</strong> ${parseFloat(d["hueValue"]).toFixed(2)}`)
                    .style("left", (event.offsetX + 15) + "px")
                    .style("top", (event.offsetY - 10) + "px");
            })
            .on("mousemove", (event: MouseEvent) => {
                tooltip
                    .style("left", (event.offsetX + 15) + "px")
                    .style("top", (event.offsetY - 10) + "px");
            })
            .on("mouseout", (event: MouseEvent) => {
                d3.select(event.currentTarget as SVGRectElement)
                    .style("stroke", "none");

                tooltip.style("opacity", 0);
            });

        let grad = svg.append("defs")
            .append("linearGradient")
            .attr("id", "heatmap_grad")
            .attr("x1", "0%")
            .attr("x2", "0%")
            .attr("y1", "100%")
            .attr("y2", "0%");

        const grad_data = my_color.range().map((value, index, element) => {
            const size = element.length - 1;
            const position = (index / size) * 100 + "%";
            return [value, position];
        });

        grad.selectAll("stop")
            .data(grad_data)
            .enter()
            .append("stop")
            .style("stop-color", (d) => d[0])
            .attr("offset", (d) => d[1]);

        // Gradient bar
        const gradBarX = MARGIN.left + innerWidth + 30;
        svg.append("rect")
            .attr("x", gradBarX)
            .attr("y", MARGIN.top)
            .attr("width", 20)
            .attr("height", innerHeight)
            .style("fill", "url(#heatmap_grad)");

        svg.append("text")
            .attr("x", gradBarX + 30)
            .attr("y", MARGIN.top + 10)
            .text(String(color_domain[1]?.toFixed(2)));

        svg.append("text")
            .attr("x", gradBarX + 30)
            .attr("y", MARGIN.top + innerHeight)
            .text(String(color_domain[0]?.toFixed(2)));

    }
}

function render({ el, model }: RenderProps<HeatmapModel>) {
    let heatmapPlot = new HeatmapPlot(el, model);
    heatmapPlot.render();
    model.on("change:data", () => heatmapPlot.render());
}

export default { render };
