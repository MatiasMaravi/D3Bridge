import type { RenderProps } from "@anywidget/types";
import * as d3 from "d3";
import "./histogramplot.css";

// Configuración de márgenes y dimensiones por defecto
const MARGIN = { top: 30, right: 30, bottom: 50, left: 60 };
const DEFAULT_WIDTH = 600;
const DEFAULT_HEIGHT = 400;

interface HistogramPlotModel {
    x_: string;
    thresholds_: number;
    color_: string;
    data: any[];
}

class HistogramPlot {
    private el: HTMLElement;
    private model: any;
    private x_: string; // x-axis column name
    private data: any[]; // Array de objetos de datos
    private width: number;
    private height: number;
    private innerWidth: number;
    private innerHeight: number;
    private color_: string; // Color de las barras
    private resizeObserver: ResizeObserver;

    constructor(el: HTMLElement, model: any) {
        this.el = el;
        this.model = model;
        this.data = model.get("data") || [];
        this.x_ = model.get("x");
        this.color_ = model.get("color_") || "steelblue";
        
        // Dimensiones iniciales (se actualizarán con el ResizeObserver)
        this.width = this.el.clientWidth || model.get("width") || DEFAULT_WIDTH;
        this.height = model.get("height") || DEFAULT_HEIGHT;
        this.innerWidth = this.width - MARGIN.left - MARGIN.right;
        this.innerHeight = this.height - MARGIN.top - MARGIN.bottom;

        // Configurar ResizeObserver para ajustar el ancho automáticamente
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

    // Procesa los datos y crea los bins del histograma
    private processBins(): d3.Bin<any, number>[] {
        const bins = d3
            .bin()
            .value((d: any) => Math.round(d[this.x_] * 10) / 10)(this.data);
        
        return bins;
    }

    // Obtiene el dominio X basado en los datos
    private getXDomain(): [number, number] {
        const extent = d3.extent(this.data, (d: any) => d[this.x_]);
        return extent as [number, number];
    }

    // Crea el histograma
    public createHistogram(): void {
        const bins = this.processBins();
        const xDomain = this.getXDomain();

        // Limpiar el contenedor
        d3.select(this.el).selectAll("*").remove();

        // Crear SVG
        const svg = d3.select(this.el)
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("class", "histogramplot-svg");

        const g = svg.append("g")
            .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

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
        g.append("g")
            .attr("class", "histogram-bars")
            .selectAll("rect")
            .data(bins)
            .join("rect")
            .attr("class", "bar")
            .attr("x", (d) => xScale(d.x0!) + 1)
            .attr("width", (d) => Math.max(0, xScale(d.x1!) - xScale(d.x0!) - 1))
            .attr("y", (d) => yScale(d.length))
            .attr("height", (d) => this.innerHeight - yScale(d.length))
            .attr("fill", this.color_);
    }

    public render(): void {
        this.createHistogram();
    }
}

function render({ el, model }: RenderProps<HistogramPlotModel>) {
    let histogram = new HistogramPlot(el, model);
    histogram.render();

    // Listeners para cambios en los traitlets de Python
    const rerender = () => {
        histogram = new HistogramPlot(el, model);
        histogram.render();
    };

    model.on("change:x", rerender);
    model.on("change:color", rerender);
    model.on("change:data", rerender);
}

export default { render };