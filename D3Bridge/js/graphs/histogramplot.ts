import type { RenderProps } from "@anywidget/types";
import { BaseModel, BasePlot } from "./base_plot";
import * as d3 from "d3";
import "./histogramplot.css";

class HistogramPlot extends BasePlot {

    // Process data to create bins for the histogram
    private processBins(): d3.Bin<any, number>[] {
        const x_ = this.model.get("x") || "";
        const data = this.model.get("data") || [];
        const bins = d3
            .bin()
            .thresholds(40)
            .value((d: any) => Math.round(d[x_] * 10) / 10)(data);
        
        return bins;
    }

    // Get the X domain based on the data
    private getXDomain(): [number, number] {
        const x_ = this.model.get("x") || "";
        const data = this.model.get("data") || [];
        const extent = d3.extent(data, (d) => d[x_]);
        return extent as [number, number];
    }

    public createHistogram(): void {
        const bins = this.processBins();
        const xDomain = this.getXDomain();
        const x_ = this.model.get("x") || "";
        const color = this.model.get("color") || "steelblue";

        // Create SVG using the inherited method
        this.createSvg("histogramplot-svg");

        // X Scale (continuous values)
        const xScale = d3.scaleLinear()
            .domain(xDomain)
            .range([0, this.innerWidth]);

        // Y Scale (frequency of the bins)
        const maxFrequency = d3.max(bins, (d) => d.length) || 0;
        const yScale = d3.scaleLinear()
            .domain([0, maxFrequency])
            .nice()
            .range([this.innerHeight, 0]);

        // Draw histogram bars
        this.g!.append("g")
            .attr("class", "histogram-bars")
            .selectAll("rect")
            .data(bins)
            .join("rect")
            .attr("class", "bar")
            .attr("x", (d) => xScale(d.x0!) + 1)
            .attr("width", (d) => Math.max(0, xScale(d.x1!) - xScale(d.x0!) - 1))
            .attr("y", (d) => yScale(d.length))
            .attr("height", (d) => this.innerHeight - yScale(d.length))
            .attr("fill", color);

        // Create axes using the inherited methods
        this.createXAxis(xScale, x_);
        this.createYAxis(yScale, "Frequency");
    }

    public render(): void {
        this.createHistogram();
    }
}

function render({ el, model }: RenderProps<BaseModel>) {
    let histogram = new HistogramPlot(el, model);
    histogram.render();

    model.on("change:x", () => histogram.render());
    model.on("change:color", () => histogram.render());
    model.on("change:data", () => histogram.render());
}

export default { render };