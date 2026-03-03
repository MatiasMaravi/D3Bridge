import type { RenderProps } from "@anywidget/types";
import * as d3 from "d3";
import { BasePlot, MARGIN, DEFAULT_HEIGHT } from "./base_plot";
import "./scatterplot.css";

interface ScatterPlotModel {
    x_: string;
    y_: string;
    hue_?: string;
    palette_: string[];
    showAxes_: boolean;
    enableZoom_: boolean;
    width?: number;
    height?: number;
    data: any[];
    onSelectionChange_?: (selected: any[]) => void;
}

class ScatterPlot extends BasePlot {
    private readonly x_: string;
    private readonly y_: string;
    private readonly hue_: string;
    private readonly palette_: string[];
    private readonly data: any[];

    // Referencias a elementos D3
    private xScale: d3.ScaleLinear<number, number> | null = null;
    private yScale: d3.ScaleLinear<number, number> | null = null;
    private xAxis: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
    private yAxis: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
    private tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined> | null = null;

    constructor(el: HTMLElement, model: any) {
        super(el, model);
        this.data = model.get("data") || [];
        this.x_ = model.get("x");
        this.y_ = model.get("y");
        this.hue_ = model.get("hue") || "";
        this.palette_ = model.get("palette") || d3.schemeCategory10;
        // Actualizar altura si se proporciona
        this.height = model.get("height") || DEFAULT_HEIGHT;
        this.innerHeight = this.height - MARGIN.top - MARGIN.bottom;
    }

    private createTooltip(): void {
        this.tooltip = d3.select(this.el)
            .append("div")
            .attr("class", "information-card")
            .style("opacity", 0);
    }

    private getColorScale(): d3.ScaleOrdinal<string, string> {
        const hueValues = this.hue_ ? 
            [...new Set(this.data.map(d => String(d[this.hue_])))] : 
            ["default"];
        
        return d3.scaleOrdinal<string>()
            .domain(hueValues)
            .range(this.palette_);
    }

    private createDots(colorScale: d3.ScaleOrdinal<string, string>): void {
        if (!this.g || !this.xScale || !this.yScale) return;

        this.g.selectAll(".dot")
            .data(this.data)
            .enter()
            .append("circle")
            .attr("class", "dot")
            .attr("r", 5)
            .attr("cx", d => this.xScale!(d[this.x_]))
            .attr("cy", d => this.yScale!(d[this.y_]))
            .attr("fill", d => this.hue_ ? colorScale(d[this.hue_]) : this.palette_[0])
            .style("opacity", 0.6)
            .on("mouseover", (event, d) => this.handleMouseOver(event, d))
            .on("mouseout", () => this.handleMouseOut())
            .on("click", (event, d) => this.handleClick(event, d));
    }

    private handleMouseOver(event: any, d: any): void {
        d3.select(event.currentTarget)
            .style("opacity", 1)
            .attr("r", 7);

        if (this.tooltip) {
            const text = `x: ${Math.round(d[this.x_] * 100) / 100}, y: ${Math.round(d[this.y_] * 100) / 100}`;
            this.tooltip
                .style("opacity", 1)
                .html(text)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 20}px`);
        }
    }

    private handleMouseOut(): void {
        d3.selectAll(".dot")
            .style("opacity", 0.6)
            .attr("r", 5);
        
        if (this.tooltip) {
            this.tooltip.style("opacity", 0);
        }
    }

    private handleClick(event: any, _d: any): void {
        const element = d3.select(event.currentTarget as Element);
        element.classed("selected", !element.classed("selected"));

        if (this.g) {
            const selected = this.g.selectAll(".dot.selected").data();
            // Enviar los valores seleccionados a Python
            this.model.set("selected_values_records", selected);
            this.model.save_changes();

        }
    }

    private setupZoom(): void {
        if (!this.svg || !this.xScale || !this.yScale) return;

        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([1, 50])
            .extent([[0, 0], [this.width, this.height]])
            .translateExtent([[0, 0], [this.width, this.height]])
            .on("zoom", (event) => this.handleZoom(event));

        this.svg.call(zoom);
    }

    private handleZoom(event: any): void {
        if (!this.xScale || !this.yScale || !this.g) return;

        const newX = event.transform.rescaleX(this.xScale);
        const newY = event.transform.rescaleY(this.yScale);

        if ( this.xAxis && this.yAxis) {
            this.xAxis.call(d3.axisBottom(newX) as any);
            this.yAxis.call(d3.axisLeft(newY) as any);
        }

        this.g.selectAll(".dot")
            .attr("cx", (d: any) => newX(d[this.x_]))
            .attr("cy", (d: any) => newY(d[this.y_]));
    }

    public createScatterPlot(): void {
        // Crear SVG usando método heredado
        this.createSvg("scatterplot-svg");

        this.createTooltip();

        // Escalas
        const xExtent = d3.extent(this.data, d => d[this.x_]) as [number, number];
        const yExtent = d3.extent(this.data, d => d[this.y_]) as [number, number];

        this.xScale = d3.scaleLinear()
            .domain(xExtent)
            .nice()
            .range([0, this.innerWidth]);

        this.yScale = d3.scaleLinear()
            .domain(yExtent)
            .nice()
            .range([this.innerHeight, 0]);

        // Color scale
        const colorScale = this.getColorScale();

        // Ejes
            this.xAxis = this.g!.append("g")
                .attr("class", "x-axis")
                .attr("transform", `translate(0,${this.innerHeight})`)
                .call(d3.axisBottom(this.xScale));

            this.yAxis = this.g!.append("g")
                .attr("class", "y-axis")
                .call(d3.axisLeft(this.yScale));

            // Etiquetas
            this.g!.append("text")
                .attr("class", "x-label")
                .attr("x", this.innerWidth / 2)
                .attr("y", this.innerHeight + MARGIN.bottom - 10)
                .attr("text-anchor", "middle")
                .text(this.x_);

            this.g!.append("text")
                .attr("class", "y-label")
                .attr("transform", "rotate(-90)")
                .attr("y", -MARGIN.left + 15)
                .attr("x", -this.innerHeight / 2)
                .attr("text-anchor", "middle")
                .text(this.y_);

        // Puntos
        this.createDots(colorScale);

        // Leyenda
        if (this.hue_) {
            this.createLegend(colorScale.domain(), colorScale);
        }

        // Zoom
        this.setupZoom();
    }

    public render(): void {
        this.createScatterPlot();
    }

    public destroy(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }
}

function render({ el, model }: RenderProps<ScatterPlotModel>): (() => void) | void {
    const plot = new ScatterPlot(el, model);
    plot.render();

    // Listeners para actualizar el gráfico cuando cambien las propiedades
    model.on("change:x_", () => plot.render());
    model.on("change:y_", () => plot.render());
    model.on("change:hue_", () => plot.render());
    model.on("change:palette_", () => plot.render());
    model.on("change:data", () => plot.render());
    model.on("change:height", () => plot.render());

    return () => plot.destroy();
}

export default { render };