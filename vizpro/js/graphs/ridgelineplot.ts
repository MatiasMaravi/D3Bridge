import type { RenderProps } from "@anywidget/types";
import * as d3 from "d3";
import { BasePlot, MARGIN, DEFAULT_HEIGHT } from "./base_plot";
import "./ridgelineplot.css";

interface RidgelinePlotModel {
    x_axes_: string[];
    showAxes_: boolean;
    width?: number;
    height?: number;
    data: any[];
    bins_: number;
}

class RidgelinePlot extends BasePlot {
    private readonly x_axes_: string[];
    private readonly data: any[];
    private readonly bins_: number;

    constructor(el: HTMLElement, model: any) {
        super(el, model);
        this.data = model.get("data") || [];
        this.x_axes_ = model.get("x_axes") || [];
        this.bins_ = model.get("bins") || 20;

        // Actualizar altura si se proporciona
        this.height = model.get("height") || DEFAULT_HEIGHT;
        this.innerHeight = this.height - MARGIN.top - MARGIN.bottom;
    }

    private getXDomain(): [number, number] {
        let allValues: number[] = [];
        for (const xAxis of this.x_axes_) {
            const values = this.data.map(d => d[xAxis]).filter(v => v != null);
            allValues = allValues.concat(values);
        }
        return d3.extent(allValues) as [number, number];
    }

    private createHistogramBins(xAxis: string, xScale: d3.ScaleLinear<number, number>): any[] {
        const values = this.data.map(d => d[xAxis]).filter(v => v != null);
        
        const histogram = d3.bin()
            .domain(xScale.domain() as [number, number])
            .thresholds(xScale.ticks(this.bins_));

        return histogram(values);
    }

    private createRidgeline(
        g: d3.Selection<SVGGElement, unknown, null, undefined>,
        xAxis: string,
        xScale: d3.ScaleLinear<number, number>,
        yScale: d3.ScaleBand<string>,
        maxBinLength: number,
        index: number
    ): void {
        const bins = this.createHistogramBins(xAxis, xScale);
        const ridgeHeight = yScale.bandwidth();

        // Escala Y local para este ridgeline
        const localYScale = d3.scaleLinear()
            .domain([0, maxBinLength])
            .range([ridgeHeight, 0]);

        // Crear el área
        const area = d3.area<any>()
            .curve(d3.curveBasis)
            .x(d => xScale((d.x0 + d.x1) / 2))
            .y0(ridgeHeight)
            .y1(d => localYScale(d.length));

        const ridgeGroup = g.append("g")
            .attr("class", "ridge-group")
            .attr("transform", `translate(0, ${yScale(xAxis) || 0})`);

        ridgeGroup.append("path")
            .datum(bins)
            .attr("class", "ridgeline-area")
            .attr("d", area)
            .style("fill", d3.schemeCategory10[index % 10])
            .style("opacity", 0.7)
            .on("mouseover", function() {
                d3.select(this).style("opacity", 1);
            })
            .on("mouseout", function() {
                d3.select(this).style("opacity", 0.7);
            });

        // Etiqueta del eje
            ridgeGroup.append("text")
                .attr("class", "ridge-label")
                .attr("x", -5)
                .attr("y", ridgeHeight / 2)
                .attr("dy", "0.35em")
                .attr("text-anchor", "end")
                .text(xAxis)
                .style("font-size", "12px");
    }

    public createRidgelinePlot(): void {
        // Crear SVG usando método heredado
        this.createSvg("ridgelineplot-svg");

        // Escalas
        const xDomain = this.getXDomain();
        const xScale = d3.scaleLinear()
            .domain(xDomain)
            .nice()
            .range([0, this.innerWidth]);

        const yScale = d3.scaleBand()
            .domain(this.x_axes_)
            .range([0, this.innerHeight])
            .padding(0.2);

        // Calcular el máximo de todas las bins para escalar uniformemente
        let maxBinLength = 0;
        for (const xAxis of this.x_axes_) {
            const bins = this.createHistogramBins(xAxis, xScale);
            const localMax = d3.max(bins, d => d.length) || 0;
            maxBinLength = Math.max(maxBinLength, localMax);
        }

        // Crear cada ridgeline
        this.x_axes_.forEach((xAxis, index) => {
            this.createRidgeline(this.g!, xAxis, xScale, yScale, maxBinLength, index);
        });

        // Eje X
            this.g!.append("g")
                .attr("class", "x-axis")
                .attr("transform", `translate(0,${this.innerHeight})`)
                .call(d3.axisBottom(xScale));

            this.g!.append("text")
                .attr("class", "x-label")
                .attr("x", this.innerWidth / 2)
                .attr("y", this.innerHeight + MARGIN.bottom - 10)
                .attr("text-anchor", "middle")
                .text("Value")
                .style("font-size", "14px");
    }

    public render(): void {
        this.createRidgelinePlot();
    }

    public destroy(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }
}

function render({ el, model }: RenderProps<RidgelinePlotModel>): (() => void) | void {
    const plot = new RidgelinePlot(el, model);
    plot.render();

    // Listeners para actualizar el gráfico cuando cambien las propiedades
    model.on("change:x_axes_", () => plot.render());
    model.on("change:showAxes_", () => plot.render());
    model.on("change:data", () => plot.render());
    model.on("change:height", () => plot.render());
    model.on("change:bins_", () => plot.render());

    return () => plot.destroy();
}

export default { render };