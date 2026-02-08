//import type { Render,Initialize, RenderProps, AnyModel } from "@anywidget/types";
import * as d3 from "d3";
import "./barplot.css";
//import { render } from "../layouts/matrix_creator";

// Configuración de márgenes y dimensiones por defecto
const MARGIN = { top: 30, right: 30, bottom: 50, left: 60 };
const DEFAULT_WIDTH = 600;
const DEFAULT_HEIGHT = 400;

function standardDeviationPerSquareRootedSize(array: number[], mean: number) {
  let sd = 0;
  array.forEach((num) => (sd = sd + (num - mean) ** 2));
  sd = Math.sqrt(sd) / array.length;
  return sd;
}

function getCI(array: number[]) {
  const mean = array.reduce((a, b) => a + b, 0) / array.length;
  const complement = 1.96 * standardDeviationPerSquareRootedSize(array, mean);
  return [mean - complement, mean + complement];
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

    constructor(el: HTMLElement, model: any) {
        this.el = el;
        this.model = model;
        this.direction_ = model.get("direction") || "vertical";
        this.data = model.get("data") || [];
        
        // Siempre x_ es la categoría e y_ es el valor numérico
        this.x_ = model.get("x");
        this.y_ = model.get("y");
        
        this.hue_ = model.get("hue") || "";
        this.palette_ = model.get("palette") || ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2"];
        
        // Dimensiones
        this.width = DEFAULT_WIDTH;
        this.height = DEFAULT_HEIGHT;
        this.innerWidth = this.width - MARGIN.left - MARGIN.right;
        this.innerHeight = this.height - MARGIN.top - MARGIN.bottom;
    }

    // Prepara los datos agregados (agrupa por x_ y calcula la media de y_)
    private prepareData(): { category: string; value: number; hue?: string }[] {
        if (this.hue_) {
            // Si hay hue, agrupamos por categoría + hue
            const grouped = d3.group(this.data, (d: any) => d[this.x_], (d: any) => d[this.hue_]);
            const result: { category: string; value: number; hue: string }[] = [];
            
            grouped.forEach((hueMap, category) => {
                hueMap.forEach((values, hue) => {
                    const mean = d3.mean(values, (d: any) => +d[this.y_]) || 0;
                    result.push({ category: String(category), value: mean, hue: String(hue) });
                });
            });
            return result;
        } else {
            // Sin hue, agrupamos solo por categoría
            const grouped = d3.group(this.data, (d: any) => d[this.x_]);
            return Array.from(grouped, ([category, values]) => ({
                category: String(category),
                value: d3.mean(values, (d: any) => +d[this.y_]) || 0
            }));
        }
    }

    // Obtiene las categorías únicas
    private getCategories(): string[] {
        return [...new Set(this.data.map((d: any) => String(d[this.x_])))];
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
        const maxValue = d3.max(preparedData, d => d.value) || 0;
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
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        // Eje Y
        g.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(yScale));

        // Etiqueta del eje Y
        g.append("text")
            .attr("class", "y-label")
            .attr("transform", "rotate(-90)")
            .attr("y", -MARGIN.left + 15)
            .attr("x", -this.innerHeight / 2)
            .attr("text-anchor", "middle")
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

            categoryGroups.selectAll("rect")
                .data(category => preparedData.filter(d => d.category === category))
                .enter()
                .append("rect")
                .attr("class", "bar")
                .attr("x", d => xSubScale(d.hue || "default") || 0)
                .attr("y", d => yScale(d.value))
                .attr("width", xSubScale.bandwidth())
                .attr("height", d => this.innerHeight - yScale(d.value))
                .attr("fill", d => colorScale(d.hue || "default"));
        } else {
            // Sin hue
            g.selectAll(".bar")
                .data(preparedData)
                .enter()
                .append("rect")
                .attr("class", "bar")
                .attr("x", d => xScale(d.category) || 0)
                .attr("y", d => yScale(d.value))
                .attr("width", xScale.bandwidth())
                .attr("height", d => this.innerHeight - yScale(d.value))
                .attr("fill", this.palette_[0]);
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
        const maxValue = d3.max(preparedData, d => d.value) || 0;
        const xScale = d3.scaleLinear()
            .domain([0, maxValue * 1.1])
            .nice()
            .range([0, this.innerWidth]);

        // Escala de colores
        const colorScale = d3.scaleOrdinal<string>()
            .domain(hueValues.length > 0 ? hueValues : ["default"])
            .range(this.palette_);

        // Eje X (valores)
        g.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${this.innerHeight})`)
            .call(d3.axisBottom(xScale));

        // Eje Y (categorías)
        g.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(yScale));

        // Etiqueta del eje X
        g.append("text")
            .attr("class", "x-label")
            .attr("x", this.innerWidth / 2)
            .attr("y", this.innerHeight + MARGIN.bottom - 10)
            .attr("text-anchor", "middle")
            .text(this.y_);

        // Dibujar barras horizontales
        if (this.hue_) {
            // Con agrupación por hue
            const categoryGroups = g.selectAll(".category-group")
                .data(categories)
                .enter()
                .append("g")
                .attr("class", "category-group")
                .attr("transform", d => `translate(0,${yScale(d)})`);

            categoryGroups.selectAll("rect")
                .data(category => preparedData.filter(d => d.category === category))
                .enter()
                .append("rect")
                .attr("class", "bar")
                .attr("x", 0)
                .attr("y", d => ySubScale(d.hue || "default") || 0)
                .attr("width", d => xScale(d.value))
                .attr("height", ySubScale.bandwidth())
                .attr("fill", d => colorScale(d.hue || "default"));
        } else {
            // Sin hue
            g.selectAll(".bar")
                .data(preparedData)
                .enter()
                .append("rect")
                .attr("class", "bar")
                .attr("x", 0)
                .attr("y", d => yScale(d.category) || 0)
                .attr("width", d => xScale(d.value))
                .attr("height", yScale.bandwidth())
                .attr("fill", this.palette_[0]);
        }

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

