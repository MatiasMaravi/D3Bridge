import type { RenderProps } from "@anywidget/types";
import * as d3 from "d3";
import { BasePlot, MARGIN, DEFAULT_HEIGHT } from "./base_plot";
import "./linearplot.css";

// Interfaz para el modelo de LinearPlot
interface LinearPlotModel {
    x_: string;
    y_: string;
    hue_: string;
    palette_: string[];
    data: any[];
    onSelectionChange_?: (selected: any[]) => void;
}
function dynamicSort(property: string) {
    var sortOrder = 1;
    if (property[0] === "-") {
        sortOrder = -1;
        property = property.substring(1);
    }
    return function (a: any, b: any) {
        var result =
            a[property] < b[property] ? -1 : a[property] > b[property] ? 1 : 0;
        return result * sortOrder;
    };
}
// Funciones auxiliares para agrupar datos
function getDataMeans(data: any[], x_value: string, y_value: string, hue: string): any[] {
    function getMeans(array: any[]) {
        const reduced = array.reduce((acc, item) => {
            if (!acc[item[x_value]]) {
                const obj: { [key: string]: any } = {};
                obj[x_value] = item[x_value];
                obj[y_value] = item[y_value];
                if (hue) obj[hue] = item[hue];
                obj["count"] = 1;
                acc[item[x_value]] = obj;
                return acc;
            }
            acc[item[x_value]][y_value] += item[y_value];
            acc[item[x_value]].count += 1;
            return acc;
        }, {});
        const mapedArray = Object.keys(reduced).map(function (k) {
            const item = reduced[k];
            const itemAverage: any = {};
            itemAverage[y_value] = item[y_value] / item.count;

            return {
                ...item,
                ...itemAverage,
            };
        });
        mapedArray.sort(dynamicSort(x_value));
        return mapedArray;
    }
    if (!hue) return getMeans(data);

    let groupedHue = groupArrayBy(data, hue);

    let dataMeans: any[] = [];
    Object.values(groupedHue).forEach(function (item, _index) {
        const means = getMeans(item as any[]);
        dataMeans = dataMeans.concat(means);
    });

    return dataMeans;
}

function groupArrayBy(array: any[], item: string) {
  return array.reduce(function (acc, i) {
    return {
      ...acc,
      [i[item]]: [...(acc[i[item]] ?? []), i],
    };
  }, {});
}
class LinearPlot extends BasePlot {
    private readonly x_: string; // x-axis column name
    private readonly y_: string; // y-axis column name
    private readonly hue_: string; // hue column name (opcional, para agrupar)
    private readonly palette_: string[]; // paleta de colores
    private readonly data: any[]; // Array de objetos de datos
    private readonly processedData: any[]; // Datos procesados con medias

    // Referencias a elementos D3
    private xScale: d3.ScaleLinear<number, number> | null = null;
    private yScale: d3.ScaleLinear<number, number> | null = null;
    private xAxisGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
    private yAxisGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
    private tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined> | null = null;

    constructor(el: HTMLElement, model: any) {
        super(el, model);
        this.data = model.get("data") || [];
        this.x_ = model.get("x");
        this.y_ = model.get("y");
        this.hue_ = model.get("hue");
        this.palette_ = model.get("palette");
        if (this.palette_.length === 0) {
            this.palette_ = d3.schemeCategory10 as string[];
        }

        // Actualizar altura si se proporciona
        this.height = model.get("height") || DEFAULT_HEIGHT;
        this.innerHeight = this.height - MARGIN.top - MARGIN.bottom;

        // Procesar datos
        this.processedData = getDataMeans(this.data, this.x_, this.y_, this.hue_);
        this.processedData.forEach((d, i) => d.id = i);
    }

    // Crear tooltip
    private createTooltip(): void {
        // Asegurar que el contenedor tenga position relative para el tooltip
        d3.select(this.el).style("position", "relative");
        
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

        this.g.selectAll(".line-dot")
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
            // Obtener la posición relativa al contenedor
            const containerRect = this.el.getBoundingClientRect();
            const tooltipX = event.clientX - containerRect.left + 10;
            const tooltipY = event.clientY - containerRect.top - 20;
            
            this.tooltip
                .style("opacity", 1)
                .html(text)
                .style("left", `${tooltipX}px`)
                .style("top", `${tooltipY}px`);
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

    private handleClick(event: MouseEvent, _d: any): void {
        const element = d3.select(event.currentTarget as Element);
        element.classed("selected", !element.classed("selected"));

        if (this.g) {
            const selected = this.g.selectAll(".line-dot.selected").data();
            // Enviar los valores seleccionados a Python
            this.model.set("selected_values_records", selected);
            this.model.save_changes();

        }
    }

    // Configurar zoom
    private setupZoom(): void {
        if (!this.svg || !this.xScale || !this.yScale) return;

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
        if (this.xAxisGroup && this.yAxisGroup) {
            this.xAxisGroup.call(d3.axisBottom(newX) as any);
            this.yAxisGroup.call(d3.axisLeft(newY) as any);
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
        // Crear SVG usando método heredado
        this.createSvg("linearplot-svg");

        // Crear tooltip
        this.createTooltip();

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

        // Guardar referencia a los grupos de ejes para el zoom
        this.xAxisGroup = this.g!.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${this.innerHeight})`)
            .call(d3.axisBottom(this.xScale));

        this.yAxisGroup = this.g!.append("g")
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

        // Crear líneas y puntos
        this.createLines(colorScale);
        this.createDots(colorScale);

        // Crear leyenda
        this.createLegend(colorScale.domain(), colorScale);

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

    model.on("change:x", () => linearplot.render());
    model.on("change:y", () => linearplot.render());
    model.on("change:hue", () => linearplot.render());
    model.on("change:palette", () => linearplot.render());
    model.on("change:data", () => linearplot.render());

    return () => {
        if (linearplot) {
            linearplot.destroy();
        }
    };
}

export default { render };