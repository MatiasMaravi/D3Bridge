import type { AnyModel } from "@anywidget/types";
import * as d3 from "d3";

const MARGIN = { top: 20, right: 40, bottom: 40, left: 40 };
const DEFAULT_WIDTH = 600;
const DEFAULT_HEIGHT = 300;

interface BaseModel {
    x: string; // x-axis column name
    y: string; // y-axis column name
    hue?: string; // hue column name
    direction?: "vertical" | "horizontal"; // Direction of the plot (barplot)
    palette?: string[]; // color palette (if not using a single color)
    color?: string; // Unique color for the plot (HistogramPlot) 
    data?: any[]; // data records
    selected_values_records?: any[]; // selected records (used for interactivity)
}

class BasePlot {
    protected el!: HTMLElement;
    protected model!: AnyModel<BaseModel>;
    protected width: number;
    protected height: number;
    protected innerWidth: number;
    protected innerHeight: number;
    protected svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
    protected g: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
    protected resizeObserver: ResizeObserver;

    private resizeTimer: number | null = null;

    constructor(el: HTMLElement, model: AnyModel<BaseModel>) {
        this.el = el;
        this.model = model;
        this.width = this.el.clientWidth || DEFAULT_WIDTH;
        this.height = this.el.clientHeight || DEFAULT_HEIGHT;
        this.innerWidth = this.width - MARGIN.left - MARGIN.right;
        this.innerHeight = this.height - MARGIN.top - MARGIN.bottom;
        
        this.resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const newWidth = entry.contentRect.width;
                const newHeight = entry.contentRect.height;
                const widthChanged = newWidth > 0 && Math.abs(newWidth - this.width) > 5;
                const heightChanged = newHeight > 0 && Math.abs(newHeight - this.height) > 5;
                if (widthChanged || heightChanged) {
                    if (this.resizeTimer){
                        clearTimeout(this.resizeTimer);
                    }
                    this.resizeTimer = window.setTimeout(() => {
                        this.width = newWidth;
                        this.height = newHeight;
                        this.innerWidth = this.width - MARGIN.left - MARGIN.right;
                        this.innerHeight = this.height - MARGIN.top - MARGIN.bottom;
                        this.render();
                    }, 200);
                }
            }
        });
        this.resizeObserver.observe(this.el);
    }

    /**
     * Cleans the container and creates the base SVG with the transformed group
     * @param cssClass Class CSS to apply to the SVG element for styling purposes
     */
    protected createSvg(cssClass: string): void {
        const currentWidth = this.el.clientWidth;
        const currentHeight = this.el.clientHeight;
        if (currentWidth > 0) this.width = currentWidth;
        if (currentHeight > 0) this.height = currentHeight;
        this.innerWidth = this.width - MARGIN.left - MARGIN.right;
        this.innerHeight = this.height - MARGIN.top - MARGIN.bottom;

        d3.select(this.el).selectAll("*").remove();
        
        this.svg = d3.select(this.el)
            .append("svg")
            .attr("class", cssClass)
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${this.width} ${this.height}`)
            .attr("preserveAspectRatio", "xMidYMid meet");
            

        this.g = this.svg.append("g")
            .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
    }

    /**
     * Creates the X-axis
     * @param scale Scale D3 for the axis
     * @param label Label for the axis (optional)
     * @param rotate If true, rotates the labels by -45 degrees
     */
    protected createXAxis(
        scale: d3.AxisScale<any>,
        label?: string,
        rotate: boolean = false
    ): void {
        if (!this.g) return;

        const xAxisGroup = this.g.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${this.innerHeight})`)
            .call(d3.axisBottom(scale));

        if (rotate) {
            xAxisGroup.selectAll("text")
                .attr("transform", "rotate(-45)")
                .style("text-anchor", "end");
        }

        if (label) {
            this.g.append("text")
                .attr("class", "x-label")
                .attr("x", this.innerWidth / 2)
                .attr("y", this.innerHeight + MARGIN.bottom - 5)
                .attr("text-anchor", "middle")
                .text(label);
        }
    }

    /**
     * Creates the Y-axis
     * @param scale Scale D3 for the axis
     * @param label Label for the axis (optional)
     */
    protected createYAxis(
        scale: d3.AxisScale<any>,
        label?: string
    ): void {
        if (!this.g) return;

        this.g.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(scale));

        if (label) {
            this.g.append("text")
                .attr("class", "y-label")
                .attr("transform", "rotate(-90)")
                .attr("y", -MARGIN.left + 15)
                .attr("x", -this.innerHeight / 2)
                .attr("text-anchor", "middle")
                .text(label);
        }
    }

    /**
     * Creates a legend for the plot
     * @param values Values for the legend
     * @param colorScale Color scale
     */
    protected createLegend(
        values: string[], 
        colorScale: d3.ScaleOrdinal<string, string>
    ): void {
        if (!this.svg) return;

        const legend = this.svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${this.width - MARGIN.right - 100}, ${MARGIN.top})`);

        const legendItems = legend.selectAll(".legend-item")
            .data(values)
            .enter()
            .append("g")
            .attr("class", "legend-item")
            .attr("transform", (_, i) => `translate(0, ${i * 20})`);

        legendItems.append("rect")
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", d => colorScale(d));

        legendItems.append("text")
            .attr("x", 20)
            .attr("y", 12)
            .text(d => d)
            .style("font-size", "12px");
    }

    public render(): void {}
}

export {
    MARGIN,
    DEFAULT_WIDTH,
    DEFAULT_HEIGHT,
    BasePlot
};
export type { BaseModel };