import type { AnyModel,RenderProps } from "@anywidget/types";
import * as d3 from "d3";
import "./geomapplot.css";
const MARGIN = { top: 20, right: 20, bottom: 40, left: 30 };
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

// Interfaces para tipar la configuración dinámica
export interface MapConfig {
    projectionType?: "mercator" | "albersUsa" | "orthographic";
    fillColor?: string | ((d: any) => string); // Puede ser estático o una función accessor
    strokeColor?: string;
    strokeWidth?: number;
    hoverFillColor?: string;
    labelProperty?: string; // Ej: "name", "ESTADO", "departamento"
}

export interface GeoMapModel {
    geojson: GeoJSON.FeatureCollection;
    config: MapConfig;
    selected_region?: string; // Para almacenar la región seleccionada en eventos de click
    // data: any[]; -> Aquí podrías agregar un dataset extra para colorear el mapa (Coropletas)
}

class GeoMapPlot {
    private el: HTMLElement;
    private model: AnyModel<GeoMapModel>;
    private width: number;
    private height: number;
    private resizeObserver: ResizeObserver;

    constructor(el: HTMLElement, model: AnyModel<GeoMapModel>) {
        this.el = el;
        this.model = model;

        // Dimensiones iniciales (se actualizarán con el ResizeObserver)
        this.width = this.el.clientWidth || DEFAULT_WIDTH;
        this.height = DEFAULT_HEIGHT;

        // Configurar ResizeObserver para ajustar el ancho automáticamente
        this.resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const newWidth = entry.contentRect.width;
                if (newWidth > 0 && newWidth !== this.width) {
                    this.width = newWidth;
                    this.render();
                }
            }
        });
        this.resizeObserver.observe(this.el);
    }

    public render(): void {
        d3.select(this.el).selectAll("*").remove();

        // Asegurar que el contenedor tenga position relative para el tooltip
        d3.select(this.el).style("position", "relative");

        const geojson = this.model.get("geojson");
        const config: MapConfig = this.model.get("config") || {};

        if (!geojson.features) return;
        const innerWidth = this.width - MARGIN.left - MARGIN.right;
        const innerHeight = this.height - MARGIN.top - MARGIN.bottom;

        const svg = d3.select(this.el)
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height);

        const g = svg.append("g")
            .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
        let projectionBase = d3.geoMercator();
        if (config.projectionType === "albersUsa") projectionBase = d3.geoAlbersUsa();
        if (config.projectionType === "orthographic") projectionBase = d3.geoOrthographic();
        // fitSize calcula automáticamente el scale y translate ideal para el GeoJSON dado
        const projection = projectionBase.fitSize([innerWidth, innerHeight], geojson);
        const pathGenerator = d3.geoPath().projection(projection);

        // 3. Zoom generalizado
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([1, 8])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });
        
        svg.call(zoom);

        // 4. Dibujar los polígonos usando la configuración dinámica
        // Crear tooltip
        const tooltip = d3.select(this.el)
            .append("div")
            .attr("class", "map-tooltip")
            .style("opacity", 0);

        const currentSelected = this.model.get("selected_region") || "";

        const paths = g.selectAll(".region")
            .data(geojson.features)
            .enter()
            .append("path")
            .attr("class", "region map-region") // Agregamos .map-region explicitamente
            .attr("d", pathGenerator as any)
            .attr("fill", (d: any) => {
                // Si está seleccionado, el CSS se encarga del color
                const label = config.labelProperty && d.properties 
                    ? d.properties[config.labelProperty!] 
                    : "";
                if (currentSelected && label === currentSelected) {
                    return "#ffcc00"; // Color de selección
                }
                return typeof config.fillColor === "function" 
                    ? config.fillColor(d) 
                    : (config.fillColor || "#cce5df");
            })
            .attr("stroke", config.strokeColor || "#333")
            .attr("stroke-width", config.strokeWidth || 1)
            .style("cursor", "pointer")
            .classed("selected", (d: any) => {
                // Solo marcar como seleccionado si hay una región seleccionada válida
                if (!currentSelected) return false;
                const label = config.labelProperty && d.properties 
                    ? d.properties[config.labelProperty!] 
                    : "";
                return label !== "" && label === currentSelected;
            });

        // 5. Interacción: hover y tooltip
        const self = this;
        paths.on("mouseover", function(_event, d: any) {
            // Obtener el label para el tooltip
            let label = "";
            if (config.labelProperty && d.properties) {
                label = d.properties[config.labelProperty] || "";
            }
            
            // Mostrar tooltip si hay label
            if (label) {
                tooltip
                    .style("opacity", 1)
                    .html(label);
            }

            // Hover fill (solo si no está seleccionado)
            if (config.hoverFillColor && !d3.select(this).classed("selected")) {
                d3.select(this).attr("fill", config.hoverFillColor);
            }
        })
        .on("mousemove", function(event) {
            const [x, y] = d3.pointer(event, self.el);
            tooltip
                .style("left", (x + 15) + "px")
                .style("top", (y + 10) + "px");
        })
        .on("mouseout", function(_event, d: any) {
            // Ocultar tooltip
            tooltip.style("opacity", 0);

            // Restaurar el color original solo si no está seleccionado
            if (!d3.select(this).classed("selected")) {
                const originalFill = typeof config.fillColor === "function" 
                    ? config.fillColor(d) 
                    : (config.fillColor || "#cce5df");
                d3.select(this).attr("fill", originalFill);
            }
        });

        // 6. Manejo del evento click
        paths.on("click", function(_event, d: any) {
            // Obtener el label de la región clickeada
            let label = "";
            if (config.labelProperty && d.properties) {
                label = d.properties[config.labelProperty] || "";
            }
            
            // Si no hay labelProperty configurado, no podemos identificar la región
            if (!label) {
                console.warn("GeoMapPlot: No labelProperty configured or property not found");
                return;
            }

            // Limpiar selección previa visual
            paths.classed("selected", false);
            
            // Restaurar colores de todos los elementos
            paths.attr("fill", (d_item: any) => typeof config.fillColor === "function" 
                ? config.fillColor(d_item) 
                : (config.fillColor || "#cce5df"));

            // Marcar nuevo seleccionado
            d3.select(this).classed("selected", true);
            d3.select(this).attr("fill", "#ffcc00"); // Color de selección
            
            // Actualizar modelo y sincronizar con Python
            self.model.set("selected_region", label);
            self.model.save_changes();
            
        });

    }

}

function render({ el, model }: RenderProps<GeoMapModel>): (() => void) | void {
    let mapPlot = new GeoMapPlot(el, model);
    mapPlot.render();

    // Escuchar cambios tanto en los datos geográficos como en la configuración
    model.on("change:geojson", () => {
        mapPlot.render();
    });
    model.on("change:config", () => {
        mapPlot.render();
    });
}

export default { render };