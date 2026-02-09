import type { RenderProps } from "@anywidget/types";
import * as d3 from "d3";
import "./barplot.css";

// Configuración de márgenes y dimensiones por defecto
const MARGIN = { top: 20, right: 20, bottom: 40, left: 30 };
const DEFAULT_WIDTH = 600;//Cambiar a el ancho del widget
const DEFAULT_HEIGHT = 600;


interface BarPlotModel {
    x_: string; // x-axis column name (categoría)
    y_: string; // y-axis column name (valor numérico)
    hue_?: string; // hue column name (opcional, para agrupar)
    direction_: "vertical" | "horizontal"; // dirección del gráfico
    palette_: string[]; // paleta de colores para las barras
    data: any[]; // Array de objetos de datos
}

class BarPlot {
    private el: HTMLElement;
    private model: any;
    private x_: string; // x-axis column name (categoría)
    private y_: string; // y-axis column name (valor numérico)
    private hue_: string; // hue column name (opcional, para agrupar)
    private direction_: "vertical" | "horizontal"; // dirección del gráfico
    private palette_: string[]; // paleta de colores para las barras
    private data: any[]; // Array de objetos de datos
    private width: number;
    private height: number;
    private innerWidth: number;
    private innerHeight: number;
    private resizeObserver: ResizeObserver;

    constructor(el: HTMLElement, model: any) {
        this.el = el;
        this.model = model;
        this.direction_ = model.get("direction") || "vertical";
        this.data = model.get("data") || [];
        
        // Siempre x_ es la categoría e y_ es el valor numérico
        this.x_ = model.get("x");
        this.y_ = model.get("y");
    
        this.hue_ = model.get("hue") || "";
        this.palette_ = model.get("palette");
        if (!this.palette_ || this.palette_.length === 0) {
            this.palette_ = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2"]
        }
        
        // Dimensiones iniciales (se actualizarán con el ResizeObserver)
        this.width = this.el.clientWidth || DEFAULT_WIDTH;
        this.height = this.el.clientHeight || DEFAULT_HEIGHT;
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

    // Prepara los datos agregados (agrupa por x_ y calcula la media de y_ y desviación estándar)
    private prepareData(): { category: string; value: number; hue?: string; sd?: number }[] {

        let result: { category: string; value: number; hue?: string; sd?: number }[] = [];

        if (this.hue_) {
            // ... lógica con hue (mantenida igual, solo agrego logs si es necesario) ...
             const grouped = d3.group(this.data, (d: any) => d[this.x_], (d: any) => d[this.hue_]);
             grouped.forEach((hueMap, category) => {
                hueMap.forEach((values, hue) => {
                    const mean = d3.mean(values, (d: any) => +d[this.y_]) || 0;
                    const sd = d3.deviation(values, (d: any) => +d[this.y_]) || 0;
                    result.push({ category: String(category), value: mean, hue: String(hue), sd: sd });
                });
            });
        } else {
            // Sin hue, agrupamos solo por categoría
            const grouped = d3.group(this.data, (d: any) => d[this.x_]);
            
            result = Array.from(grouped, ([category, values]) => ({
                category: String(category),
                value: d3.mean(values, (d: any) => +d[this.y_]) || 0,
                sd: d3.deviation(values, (d: any) => +d[this.y_]) || 0
            }));
        }

        return result;
    }

    // Obtiene las categorías únicas
    private getCategories(): string[] {
        const unique = [...new Set(this.data.map((d: any) => String(d[this.x_])))];
        
        // Ordenar correctamente (numérico o alfabético) para evitar ejes desordenados
        unique.sort((a, b) => {
            const numA = parseFloat(a);
            const numB = parseFloat(b);
            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }
            return a.localeCompare(b);
        });

        return unique;
    }

    // Obtiene los valores únicos de hue
    private getHueValues(): string[] {
        if (!this.hue_) return [];
        return [...new Set(this.data.map((d: any) => String(d[this.hue_])))];
    }

    public createVerticalBarPlot(): void {
        const preparedData = this.prepareData();
        const categories = this.getCategories();
        const hueValues = this.getHueValues();

        // Limpiar el contenedor
        d3.select(this.el).selectAll("*").remove();

        // Crear SVG
        const svg = d3.select(this.el)
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("class", "barplot-svg");

        const g = svg.append("g")
            .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

        // Escala X (categorías)
        const xScale = d3.scaleBand()
            .domain(categories)
            .range([0, this.innerWidth])
            .padding(0.2);

        // Escala X para subgrupos (hue)
        const xSubScale = d3.scaleBand()
            .domain(hueValues.length > 0 ? hueValues : ["default"])
            .range([0, xScale.bandwidth()])
            .padding(0.05);

        // Escala Y (valores numéricos)
        const maxValue = d3.max(preparedData, d => d.value + (d.sd || 0)) || 0;
        const yScale = d3.scaleLinear()
            .domain([0, maxValue * 1.1])
            .nice()
            .range([this.innerHeight, 0]);

        // Escala de colores
        const colorScale = d3.scaleOrdinal<string>()
            .domain(hueValues.length > 0 ? hueValues : ["default"])
            .range(this.palette_);

        // Eje X
        g.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${this.innerHeight})`)
            .call(d3.axisBottom(xScale))
            .selectAll("text")
            .attr("transform", "rotate(-45)");

        // Eje Y
        g.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(yScale));

        // Etiqueta del eje Y
        g.append("text")
            .attr("class", "y-label")
            .attr("transform", "rotate(-90)")
            .attr("y", -MARGIN.left + 10)
            .attr("x", -this.innerHeight / 2)
            .text(this.y_);

        // Dibujar barras
        if (this.hue_) {
            // Con agrupación por hue
            const categoryGroups = g.selectAll(".category-group")
                .data(categories)
                .enter()
                .append("g")
                .attr("class", "category-group")
                .attr("transform", d => `translate(${xScale(d)},0)`);

            const groups = categoryGroups.selectAll("g.bar-group")
                .data(category => preparedData.filter(d => d.category === category))
                .enter()
                .append("g")
                .attr("class", "bar-group")
                .attr("transform", d => `translate(${xSubScale(d.hue || "default") || 0}, 0)`);

            groups.append("rect")
                .attr("class", "bar")
                .attr("y", d => yScale(d.value))
                .attr("width", xSubScale.bandwidth())
                .attr("height", d => this.innerHeight - yScale(d.value))
                .attr("fill", d => colorScale(d.hue || "default"));
            
            // Líneas de desviación estándar
            groups.append("line")
                .attr("class", "error-line")
                .attr("x1", xSubScale.bandwidth() / 2)
                .attr("x2", xSubScale.bandwidth() / 2)
                .attr("y1", d => yScale(d.value - (d.sd || 0)))
                .attr("y2", d => yScale(d.value + (d.sd || 0)))
                .attr("stroke", "black")
                .attr("stroke-width", 1.5);


        } else {
            // Sin hue
            const bars = g.selectAll(".bar-group")
                .data(preparedData)
                .enter()
                .append("g")
                .attr("class", "bar-group")
                .attr("transform", d => `translate(${xScale(d.category) || 0}, 0)`);

            bars.append("rect")
                .attr("class", "bar")
                .attr("y", d => yScale(d.value))
                .attr("width", xScale.bandwidth())
                .attr("height", d => this.innerHeight - yScale(d.value))
                .attr("fill", (d, i) => this.palette_[i % this.palette_.length]);

            // Líneas de desviación estándar
            bars.append("line")
                .attr("class", "error-line")
                .attr("x1", xScale.bandwidth() / 2)
                .attr("x2", xScale.bandwidth() / 2)
                .attr("y1", d => yScale(d.value - (d.sd || 0)))
                .attr("y2", d => yScale(d.value + (d.sd || 0)))
                .attr("stroke", "black")
                .attr("stroke-width", 1.5);

        }

        // Leyenda si hay hue
        if (this.hue_ && hueValues.length > 0) {
            this.createLegend(svg, hueValues, colorScale);
        }
    }

    public createHorizontalBarPlot(): void {
        const preparedData = this.prepareData();
        const categories = this.getCategories();
        const hueValues = this.getHueValues();

        // Limpiar el contenedor
        d3.select(this.el).selectAll("*").remove();

        // Crear SVG
        const svg = d3.select(this.el)
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("class", "barplot-svg");

        const g = svg.append("g")
            .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

        // Escala Y (categorías - en horizontal, las categorías van en Y)
        const yScale = d3.scaleBand()
            .domain(categories)
            .range([0, this.innerHeight])
            .padding(0.2);

        // Escala Y para subgrupos (hue)
        const ySubScale = d3.scaleBand()
            .domain(hueValues.length > 0 ? hueValues : ["default"])
            .range([0, yScale.bandwidth()])
            .padding(0.05);

        // Escala X (valores numéricos - en horizontal, los valores van en X)
        const maxValue = d3.max(preparedData, d => d.value + (d.sd || 0)) || 0;
        const xScale = d3.scaleLinear()
            .domain([0, maxValue * 1.1])
            .nice()
            .range([0, this.innerWidth]);

        // Escala de colores
        const colorScale = d3.scaleOrdinal<string>()
            .domain(hueValues.length > 0 ? hueValues : ["default"])
            .range(this.palette_);

        // Dibujar barras horizontales
        if (this.hue_) {
            // Con agrupación por hue
            const categoryGroups = g.selectAll(".category-group")
                .data(categories)
                .enter()
                .append("g")
                .attr("class", "category-group")
                .attr("transform", d => `translate(0,${yScale(d)})`);

            const groups = categoryGroups.selectAll("g.bar-group")
                .data(category => preparedData.filter(d => d.category === category))
                .enter()
                .append("g")
                .attr("class", "bar-group")
                .attr("transform", d => `translate(0, ${ySubScale(d.hue || "default") || 0})`);

            groups.append("rect")
                .attr("class", "bar")
                .attr("x", 0)
                .attr("width", d => xScale(d.value))
                .attr("height", ySubScale.bandwidth())
                .attr("fill", d => colorScale(d.hue || "default"));

            // Líneas de desviación estándar
            groups.append("line")
                .attr("class", "error-line")
                .attr("x1", d => xScale(d.value - (d.sd || 0)))
                .attr("x2", d => xScale(d.value + (d.sd || 0)))
                .attr("y1", ySubScale.bandwidth() / 2)
                .attr("y2", ySubScale.bandwidth() / 2)
                .attr("stroke", "black")
                .attr("stroke-width", 1);


        } else {
            // Sin hue
            const bars = g.selectAll(".bar-group")
                .data(preparedData)
                .enter()
                .append("g")
                .attr("class", "bar-group")
                .attr("transform", d => `translate(0, ${yScale(d.category) || 0})`);

            bars.append("rect")
                .attr("class", "bar")
                .attr("x", 0)
                .attr("width", d => xScale(d.value))
                .attr("height", yScale.bandwidth())
                .attr("fill", (d, i) => this.palette_[i % this.palette_.length]);

             // Líneas de desviación estándar
             bars.append("line")
                .attr("class", "error-line")
                .attr("x1", d => xScale(d.value - (d.sd || 0)))
                .attr("x2", d => xScale(d.value + (d.sd || 0)))
                .attr("y1", yScale.bandwidth() / 2)
                .attr("y2", yScale.bandwidth() / 2)
                .attr("stroke", "black")
                .attr("stroke-width", 1);

        }
        // Eje X (valores)
        g.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${this.innerHeight})`)
            .call(d3.axisBottom(xScale));

        // Eje Y (categorías)
        g.append("g")
            .attr("class", "y-axis")
            .attr("transform", `translate(0,0)`)
            .call(d3.axisLeft(yScale))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .attr("dx", "0.15em")
            .attr("dy", "0.1em");

        // Etiqueta del eje X
        g.append("text")
            .attr("class", "x-label")
            .attr("x", this.innerWidth / 2)
            .attr("y", this.innerHeight + MARGIN.bottom - 10 )
            .attr("text-anchor", "middle")
            .text(this.y_);

        // Leyenda si hay hue
        if (this.hue_ && hueValues.length > 0) {
            this.createLegend(svg, hueValues, colorScale);
        }
    }

    private createLegend(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, 
                         hueValues: string[], 
                         colorScale: d3.ScaleOrdinal<string, string>): void {
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${this.width - MARGIN.right - 100}, ${MARGIN.top})`);

        const legendItems = legend.selectAll(".legend-item")
            .data(hueValues)
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

    public render(): void {
        if (this.direction_ === "vertical") {
            this.createVerticalBarPlot();
        } else {
            this.createHorizontalBarPlot();
        }
    }
}

function render({ el, model }: RenderProps<BarPlotModel>) {
    let barPlot = new BarPlot(el, model);
    barPlot.render();

    // Listeners para cambios en los traitlets de Python
    const rerender = () => {
        barPlot = new BarPlot(el, model);
        barPlot.render();
    };

    model.on("change:x", rerender);
    model.on("change:y", rerender);
    model.on("change:hue", rerender);
    model.on("change:direction", rerender);
    model.on("change:palette", rerender);
    model.on("change:data", rerender);
}

export default {render};
