import type { AnyModel } from "@anywidget/types";
import * as d3 from "d3";

// Configuración de márgenes y dimensiones por defecto
const MARGIN = { top: 30, right: 30, bottom: 50, left: 60 };
const DEFAULT_WIDTH = 600;
const DEFAULT_HEIGHT = 400;

// Interfaz para el modelo base
interface BaseModel {
    x: string; // x-axis column name
    y: string; // y-axis column name
    hue?: string; // hue column name
    direction?: "vertical" | "horizontal"; // dirección de las barras (para BarPlot)
    palette?: string[]; // paleta de colores para las barras
    color?: string; // color único (si no se usa palette)
    data?: any[]; // datos para la gráfica
    selected_values_records?: any[]; // registros seleccionados (para interactividad)
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

    constructor(el: HTMLElement, model: AnyModel<BaseModel>) {
        this.el = el;
        this.model = model;
        this.width = this.el.clientWidth || DEFAULT_WIDTH;
        this.height = DEFAULT_HEIGHT;
        this.innerWidth = this.width - MARGIN.left - MARGIN.right;
        this.innerHeight = this.height - MARGIN.top - MARGIN.bottom;
        
        this.resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const newWidth = entry.contentRect.width;
                if (newWidth > 0 && newWidth !== this.width) {
                    this.width = newWidth;
                    this.innerWidth = this.width - MARGIN.left - MARGIN.right;
                    this.render();
                }
            }
        });
        this.resizeObserver.observe(this.el);
    }

    /**
     * Limpia el contenedor y crea el SVG base con el grupo transformado
     * @param cssClass Clase CSS para el SVG
     */
    protected createSvg(cssClass: string): void {
        d3.select(this.el).selectAll("*").remove();
        
        this.svg = d3.select(this.el)
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("class", cssClass);

        this.g = this.svg.append("g")
            .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
    }

    /**
     * Crea el eje X
     * @param scale Escala D3 para el eje
     * @param label Etiqueta del eje (opcional)
     * @param rotate Si es true, rota las etiquetas -45 grados
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
     * Crea el eje Y
     * @param scale Escala D3 para el eje
     * @param label Etiqueta del eje (opcional)
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
     * Crea una leyenda para el gráfico
     * @param values Valores para la leyenda
     * @param colorScale Escala de colores
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