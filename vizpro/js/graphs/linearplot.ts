import type { RenderProps } from "@anywidget/types";
import * as d3 from "d3";
import "./linearplot.css";

// Configuración de márgenes y dimensiones por defecto
const MARGIN = { top: 30, right: 30, bottom: 50, left: 60 };
const DEFAULT_WIDTH = 600;
const DEFAULT_HEIGHT = 400;

// Interfaz para el modelo de LinearPlot
interface LinearPlotModel {
    x_: string;
    y_: string;
    hue_?: string;
    palette_: string[];
    data: any[];
    onSelectionChange_?: (selected: any[]) => void;
}

// Funciones auxiliares para agrupar datos
function getDataMeans(data: any[], xCol: string, yCols: string[], hueCol?: string): any[] {
    if (!hueCol) return data;
    
    const grouped = d3.group(data, (d: any) => d[xCol], (d: any) => d[hueCol]);
    const result: any[] = [];
    
    grouped.forEach((hueMap, xVal) => {
        hueMap.forEach((values, hueVal) => {
            const item: any = { [xCol]: xVal, [hueCol]: hueVal };
            yCols.forEach(yCol => {
                item[yCol] = d3.mean(values, (d: any) => +d[yCol]) || 0;
            });
            result.push(item);
        });
    });
    
    return result.length > 0 ? result : data;
}

function groupArrayBy(data: any[], key: string): { [key: string]: any[] } {
    return data.reduce((result, item) => {
        const groupKey = item[key];
        if (!result[groupKey]) result[groupKey] = [];
        result[groupKey].push(item);
        return result;
    }, {});
}

class LinearPlot {
    private el: HTMLElement;
    private model: any;
    private x_: string; // x-axis column name
    private y_: string; // y-axis column name
    private hue_: string; // hue column name (opcional, para agrupar)
    private palette_: string[]; // paleta de colores
    private data: any[]; // Array de objetos de datos
    private processedData: any[]; // Datos procesados con medias
    private width: number;
    private height: number;
    private innerWidth: number;
    private innerHeight: number;
    private resizeObserver: ResizeObserver;
    
    // Referencias a elementos D3
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
    private g: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
    private xScale: d3.ScaleLinear<number, number> | null = null;
    private yScale: d3.ScaleLinear<number, number> | null = null;
    private xAxis: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
    private yAxis: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
    private tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined> | null = null;

    constructor(el: HTMLElement, model: any) {
        this.el = el;
        this.model = model;
        this.data = model.get("data") || [];
        this.x_ = model.get("x");
        this.y_ = model.get("y");
        this.hue_ = model.get("hue") || "";
        this.palette_ = model.get("palette") || d3.schemeCategory10;
        
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
        
        // Procesar datos
        this.processedData = getDataMeans(this.data, this.x_, [this.y_], this.hue_);
        this.processedData.forEach((d, i) => d.id = i);
    }

    // Crear tooltip
    private createTooltip(): void {
        this.tooltip = d3.select(this.el)
            .append("div")
            .attr("class", "linearplot-tooltip")
            .style("opacity", 0);
    }

    // Obtener escala de colores
    private getColorScale(): d3.ScaleOrdinal<string, string> {
        const domain = this.hue_ ? [...new Set(this.processedData.map(d => String(d[this.hue_])))] : ["default"];
        return d3.scaleOrdinal<string>()
            .domain(domain)
            .range(this.palette_ as string[]);
    }

    // Crear líneas del gráfico
    private createLines(colorScale: d3.ScaleOrdinal<string, string>): void {
        if (!this.g || !this.xScale || !this.yScale) return;

        const lineGenerator = d3.line<any>()
            .x(d => this.xScale!(d[this.x_]))
            .y(d => this.yScale!(d[this.y_]));

        if (!this.hue_) {
            this.g.append("path")
                .datum(this.processedData)
                .attr("class", "line-path")
                .attr("fill", "none")
                .attr("stroke", this.palette_[0])
                .attr("stroke-width", 2)
                .attr("d", lineGenerator);
        } else {
            const groupedByHue = groupArrayBy(this.processedData, this.hue_);
            Object.keys(groupedByHue).forEach(key => {
                this.g!.append("path")
                    .datum(groupedByHue[key])
                    .attr("class", "line-path")
                    .attr("fill", "none")
                    .attr("stroke", colorScale(key))
                    .attr("stroke-width", 2)
                    .attr("d", lineGenerator);
            });
        }
    }

    // Crear puntos del gráfico
    private createDots(colorScale: d3.ScaleOrdinal<string, string>): void {
        if (!this.g || !this.xScale || !this.yScale) return;

        const dots = this.g.selectAll(".line-dot")
            .data(this.processedData)
            .enter()
            .append("circle")
            .attr("class", "line-dot")
            .attr("r", 3)
            .attr("cx", d => this.xScale!(d[this.x_]))
            .attr("cy", d => this.yScale!(d[this.y_]))
            .attr("fill", d => this.hue_ ? colorScale(d[this.hue_]) : this.palette_[0])
            .style("opacity", 0.6)
            .on("mouseover", (event, d) => this.handleMouseOver(event, d))
            .on("mouseout", () => this.handleMouseOut())
            .on("click", (event, d) => this.handleClick(event, d));
    }

    // Manejadores de eventos
    private handleMouseOver(event: MouseEvent, d: any): void {
        d3.select(event.currentTarget as Element)
            .style("opacity", 1)
            .attr("r", 5);

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
        d3.selectAll(".line-dot")
            .style("opacity", 0.6)
            .attr("r", 3);

        if (this.tooltip) {
            this.tooltip.style("opacity", 0);
        }
    }

    private handleClick(event: MouseEvent, d: any): void {
        const element = d3.select(event.currentTarget as Element);
        element.classed("selected", !element.classed("selected"));
        
        if (this.g) {
            const selected = this.g.selectAll(".line-dot.selected").data();
            // Enviar los valores seleccionados a Python
            this.model.set("selected_values_records", selected);
            this.model.save_changes();

        }
    }

    // Crear leyenda
    private createLegend(colorScale: d3.ScaleOrdinal<string, string>): void {
        if (!this.hue_ || !this.svg) return;

        const legendData = colorScale.domain();
        const legend = this.svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${this.width - 120}, ${MARGIN.top})`);

        const legendItems = legend.selectAll(".legend-item")
            .data(legendData)
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

    // Configurar zoom
    private setupZoom(): void {
        if ( !this.svg || !this.xScale || !this.yScale) return;

        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([1, 50])
            .extent([[0, 0], [this.width, this.height]])
            .translateExtent([[0, 0], [this.width, this.height]])
            .on("zoom", (event) => this.handleZoom(event));

        this.svg.call(zoom);
    }

    private handleZoom(event: d3.D3ZoomEvent<SVGSVGElement, unknown>): void {
        if (!this.xScale || !this.yScale || !this.g) return;

        const newX = event.transform.rescaleX(this.xScale);
        const newY = event.transform.rescaleY(this.yScale);

        // Actualizar ejes
        if ( this.xAxis && this.yAxis) {
            this.xAxis.call(d3.axisBottom(newX) as any);
            this.yAxis.call(d3.axisLeft(newY) as any);
        }

        // Actualizar líneas
        const lineGenerator = d3.line<any>()
            .x(d => newX(d[this.x_]))
            .y(d => newY(d[this.y_]));

        this.g.selectAll(".line-path")
            .attr("d", lineGenerator as any);

        // Actualizar puntos
        this.g.selectAll(".line-dot")
            .attr("cx", (d: any) => newX(d[this.x_]))
            .attr("cy", (d: any) => newY(d[this.y_]));
    }

    // Crear el gráfico completo
    public createLinearPlot(): void {
        // Limpiar el contenedor
        d3.select(this.el).selectAll("*").remove();

        // Crear tooltip
        this.createTooltip();

        // Crear SVG
        this.svg = d3.select(this.el)
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("class", "linearplot-svg");

        this.g = this.svg.append("g")
            .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

        // Crear escalas
        const xExtent = d3.extent(this.processedData, d => d[this.x_]) as [number, number];
        const yExtent = d3.extent(this.processedData, d => d[this.y_]) as [number, number];

        this.xScale = d3.scaleLinear()
            .domain(xExtent)
            .nice()
            .range([0, this.innerWidth]);

        this.yScale = d3.scaleLinear()
            .domain(yExtent)
            .nice()
            .range([this.innerHeight, 0]);

        // Escala de colores
        const colorScale = this.getColorScale();

            this.xAxis = this.g.append("g")
                .attr("class", "x-axis")
                .attr("transform", `translate(0,${this.innerHeight})`)
                .call(d3.axisBottom(this.xScale));

            this.yAxis = this.g.append("g")
                .attr("class", "y-axis")
                .call(d3.axisLeft(this.yScale));

            // Etiquetas
            this.g.append("text")
                .attr("class", "x-label")
                .attr("x", this.innerWidth / 2)
                .attr("y", this.innerHeight + MARGIN.bottom - 10)
                .attr("text-anchor", "middle")
                .text(this.x_);

            this.g.append("text")
                .attr("class", "y-label")
                .attr("transform", "rotate(-90)")
                .attr("y", -MARGIN.left + 15)
                .attr("x", -this.innerHeight / 2)
                .attr("text-anchor", "middle")
                .text(this.y_);

        // Crear líneas y puntos
        this.createLines(colorScale);
        this.createDots(colorScale);

        // Crear leyenda
        this.createLegend(colorScale);

        // Configurar zoom
        this.setupZoom();
    }

    public render(): void {
        this.createLinearPlot();
    }

    public destroy(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }
}

function render({ el, model }: RenderProps<LinearPlotModel>): (() => void) | void {
    let linearplot = new LinearPlot(el, model);
    linearplot.render();

    // Listeners para cambios en los traitlets de Python
    const rerender = () => {
        if (linearplot) {
            linearplot.destroy();
        }
        linearplot = new LinearPlot(el, model);
        linearplot.render();
    };

    model.on("change:x", rerender);
    model.on("change:y", rerender);
    model.on("change:hue", rerender);
    model.on("change:palette", rerender);
    model.on("change:data", rerender);

    return () => {
        if (linearplot) {
            linearplot.destroy();
        }
    };
}

export default { render };