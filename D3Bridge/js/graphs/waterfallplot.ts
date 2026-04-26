import type { RenderProps } from "@anywidget/types";
import * as d3 from "d3";
import { DEFAULT_SINGLE_HEIGHT, ShapPlot } from "./shap_plot";
import type { ShapModel, ShapRecord } from "./shap_plot";
import "./waterfallplot.css";

const WATERFALL_MARGIN = { top: 30, right: 20, bottom: 50, left: 150 };
const NEGATIVE_COLOR = "#33AFFF";
const POSITIVE_COLOR = "#FF335B";

const X_KEY = "values";
const Y_KEY = "feature_names";
const Z_KEY = "data";
const BAR_HEIGHT_PX = 40;

// Sort by absolute value (shap_plot.absoluteSort operates on arrays)
function sortByAbsValue(property: string, ascending: boolean): (a: any, b: any) => number {
    let order = ascending ? -1 : 1;
    return function (a, b) {
        const aValue = Math.abs(a[property]);
        const bValue = Math.abs(b[property]);
        if (aValue < bValue) return order;
        if (aValue > bValue) return -order;
        return 0;
    };
}

function getDomain(data: any[], x_value: string, baseValue: number): [number, number] {
    let min = baseValue;
    let max = baseValue;
    let currentValue = baseValue;
    const error_margin = 0.05;

    data.forEach((d) => {
        currentValue = currentValue + d[x_value];
        if (min > currentValue) min = currentValue;
        if (max < currentValue) max = currentValue;
    });

    const total = max - min;
    min = min - total * error_margin;
    max = max + total * error_margin;

    return [min, max];
}

function getPolygon(
    xStart: number,
    xEnd: number,
    yStart: string,
    xScale: d3.ScaleLinear<number, number>,
    yScale: d3.ScaleBand<string>
): { x: number; y: number }[] {
    const x = xScale(xStart);
    const y = (yScale(yStart) || 0) + yScale.bandwidth() / 2;
    const length = xScale(xEnd) - xScale(0);
    let TRI_HEIGHT = 10;
    const HALF_HEIGHT = yScale.bandwidth() / 2;

    if (length < 0) TRI_HEIGHT = -TRI_HEIGHT;

    if (Math.abs(length) < Math.abs(TRI_HEIGHT)) {
        return [
            { x: x, y: y + HALF_HEIGHT },
            { x: x + length, y: y },
            { x: x, y: y - HALF_HEIGHT },
        ];
    } else {
        return [
            { x: x, y: y + HALF_HEIGHT },
            { x: x + length - TRI_HEIGHT, y: y + HALF_HEIGHT },
            { x: x + length, y: y },
            { x: x + length - TRI_HEIGHT, y: y - HALF_HEIGHT },
            { x: x, y: y - HALF_HEIGHT },
        ];
    }
}

function getColor(xStart: number, xEnd: number): string {
    const length = xEnd - xStart;
    return length >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR;
}

class WaterfallPlot extends ShapPlot {

    public render(): void {
        d3.select(this.el).selectAll("*").remove();

        const data: ShapRecord[] = [...(this.model.get("data") || [])];
        const baseValue: number = this.model.get("base_value") ?? 0;
        const x_ = X_KEY;
        const y_ = Y_KEY;
        const z_ = Z_KEY;

        this.height = Math.max(
            DEFAULT_SINGLE_HEIGHT,
            data.length * BAR_HEIGHT_PX + WATERFALL_MARGIN.top + WATERFALL_MARGIN.bottom
        );

        data.sort(sortByAbsValue(x_, true));

        const innerWidth = this.width - WATERFALL_MARGIN.left - WATERFALL_MARGIN.right;
        const innerHeight = this.height - WATERFALL_MARGIN.top - WATERFALL_MARGIN.bottom;

        const svg = d3.select(this.el)
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("class", "waterfallplot-svg");

        const g = svg.append("g")
            .attr("transform", `translate(${WATERFALL_MARGIN.left},${WATERFALL_MARGIN.top})`);

        // Scales
        const xDomain = getDomain(data, x_, baseValue);
        const xScale = d3.scaleLinear()
            .domain(xDomain)
            .nice()
            .range([0, innerWidth]);

        const yScale = d3.scaleBand()
            .domain(data.map(d => d[y_]))
            .range([0, innerHeight])
            .padding(0.2);

        // Axes
        g.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale));

        g.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(yScale).tickFormat((d, i) => {
                const value = Math.round((data[i] as any)[z_] * 1000) / 1000;
                return `${value} - ${d}`;
            }));

        g.append("text")
            .attr("class", "x-label")
            .attr("x", innerWidth / 2)
            .attr("y", innerHeight + WATERFALL_MARGIN.bottom - 10)
            .attr("text-anchor", "middle")
            .text(x_);

        const call_update_selected = () => {
            this.set_selected_values(g.selectAll<SVGPolygonElement, any>(".polygon.selected").data());
        };

        const handleClick = (event: MouseEvent, _d: any) => {
            const selection = d3.select(event.currentTarget as SVGPolygonElement);
            selection.classed("selected", !selection.classed("selected"));
            call_update_selected();
        };

        let startingPoint = baseValue;
        g.selectAll(".polygon")
            .data(data)
            .enter()
            .append("polygon")
            .attr("class", "polygon")
            .attr("points", (d) => {
                const xStart = startingPoint;
                startingPoint = startingPoint + d[x_];
                return getPolygon(xStart, d[x_], d[y_], xScale, yScale)
                    .map(p => `${p.x},${p.y}`).join(" ");
            })
            .attr("fill", (d) => getColor(0, d[x_]))
            .attr("cursor", "pointer")
            .on("click", handleClick);

        // Connective lines
        startingPoint = baseValue;
        g.selectAll(".waterfall-connector")
            .data(data)
            .enter()
            .append("path")
            .attr("class", "waterfall-connector")
            .attr("d", (d) => {
                startingPoint = startingPoint + d[x_];
                const y1 = (yScale(d[y_]) || 0) - yScale.bandwidth() / 4;
                const y2 = (yScale(d[y_]) || 0) + yScale.bandwidth();
                return d3.line()([
                    [xScale(startingPoint), y1],
                    [xScale(startingPoint), y2]
                ]);
            });

        // Value labels
        const textMaxWidth = 50;
        startingPoint = baseValue;
        const labels = g.selectAll(".waterfall-label-group")
            .data(data)
            .enter()
            .append("g")
            .attr("class", "waterfall-label-group")
            .attr("transform", (d) => {
                const xStart = startingPoint;
                startingPoint = startingPoint + d[x_];
                const barWidth = Math.abs(xScale(d[x_]) - xScale(0));
                const x = barWidth > textMaxWidth
                    ? (xScale(startingPoint) + xScale(xStart)) / 2 - textMaxWidth / 2
                    : d[x_] >= 0 ? xScale(startingPoint) : xScale(startingPoint) - textMaxWidth;
                return `translate(${x}, ${yScale(d[y_]) || 0})`;
            });

        labels.append("text")
            .attr("class", "waterfall-label")
            .attr("x", textMaxWidth / 2)
            .attr("y", yScale.bandwidth() / 2)
            .attr("dy", 1)
            .attr("dominant-baseline", "middle")
            .attr("text-anchor", "middle")
            .attr("fill", (d) => {
                const barWidth = Math.abs(xScale(d[x_]) - xScale(0));
                return barWidth > textMaxWidth ? "white"
                    : d[x_] >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR;
            })
            .text((d) => {
                const text = String(Math.round(d[x_] * 100) / 100);
                return d[x_] >= 0 ? "+" + text : text;
            });

        g.append("text")
            .attr("class", "waterfall-result")
            .attr("x", xScale(startingPoint) - 10)
            .attr("y", 10)
            .text(`f(x) = ${Math.round(startingPoint * 1000) / 1000}`);
    }
}

function render({ model, el }: RenderProps<ShapModel>) {
    let plot = new WaterfallPlot(el, model);
    plot.render();
    model.on("change:data", () => plot.render());
    model.on("change:base_value", () => plot.render());
}

export default { render };