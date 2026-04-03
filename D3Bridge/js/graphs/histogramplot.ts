import type { RenderProps } from "@anywidget/types";
import { BaseModel, BasePlot } from "./base_plot";
import * as d3 from "d3";
import "./histogramplot.css";

class HistogramPlot extends BasePlot {

    // Procesa los datos y crea los bins del histograma
    private processBins(): d3.Bin<any, number>[] {
        const x_ = this.model.get("x") || "";
        const data = this.model.get("data") || [];
        const bins = d3
            .bin()
            .thresholds(40)
            .value((d: any) => Math.round(d[x_] * 10) / 10)(data);
        
        return bins;
    }

    // Obtiene el dominio X basado en los datos
    private getXDomain(): [number, number] {
        const x_ = this.model.get("x") || "";
        const data = this.model.get("data") || [];
        const extent = d3.extent(data, (d) => d[x_]);
        return extent as [number, number];
    }

    // Crea el histograma
    public createHistogram(): void {
        const bins = this.processBins();
        const xDomain = this.getXDomain();
        const x_ = this.model.get("x") || "";
        const color = this.model.get("color") || "steelblue";

        // Crear SVG usando el método heredado
        this.createSvg("histogramplot-svg");

        // Escala X (valores continuos)
        const xScale = d3.scaleLinear()
            .domain(xDomain)
            .range([0, this.innerWidth]);

        // Escala Y (frecuencia de los bins)
        const maxFrequency = d3.max(bins, (d) => d.length) || 0;
        const yScale = d3.scaleLinear()
            .domain([0, maxFrequency])
            .nice()
            .range([this.innerHeight, 0]);

        // Dibujar barras del histograma
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

        // Crear ejes usando los métodos heredados
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