import type { RenderProps } from "@anywidget/types";
import * as d3 from "d3";
import "./mapplot.css";

// Configuración de dimensiones por defecto
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

interface MapPlotModel {
    data: any[];
    geo_data: any;
}

class MapPlot {
    private el: HTMLElement;
    private model: any;
    private data: any[]; // Array de datos con ubicaciones (debe tener ESTADO, LATITUDE, LONGITUDE, NO_ENTIDADE)
    private width: number;
    private height: number;
    private g: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
    private GG: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
    private projection: d3.GeoProjection | null = null;
    private path: d3.GeoPath | null = null;
    private timeout: number | null = null;
    private selectedSchools: any[] = [];
    private geoData: any = null;
    private resizeObserver: ResizeObserver;

    constructor(el: HTMLElement, model: any) {
        this.el = el;
        this.model = model;
        this.data = model.get("data") || [];
        this.geoData = model.get("geo_data") || null;
        
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

        // Renderizar inmediatamente
        this.render();
    }

    // Actualizar selección con debounce (1000ms como en el original)
    private updateSelection(selection: any[]): void {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        
        this.timeout = window.setTimeout(() => {
            // Enviar los valores seleccionados a Python
            this.model.set("selected_values_records", selection);
            this.model.save_changes();
        }, 1000);
    }

    // Agregar marcador de escuela
    private addSchoolMarker(lat: number, lon: number, name: string): void {
        if (!this.g || !this.projection) return;

        const coords = this.projection([lon, lat]);
        if (!coords) return;

        this.g.append("circle")
            .attr("cx", coords[0])
            .attr("cy", coords[1])
            .attr("r", 1)
            .attr("fill", "red")
            .attr("stroke", "black")
            .attr("stroke-width", 0.1)
            .append("title")
            .text(name);
    }

    // Cargar escuelas para un estado específico
    private loadSchoolsForState(stateName: string): void {
        if (!this.g) return;

        const schoolsInState = this.data.filter(d => d.ESTADO === stateName);

        // Limpiar marcadores existentes
        this.g.selectAll("circle").remove();
        this.selectedSchools = [];

        // Agregar nuevos marcadores
        schoolsInState.forEach(school => {
            const lat = parseFloat(school.LATITUDE);
            const lon = parseFloat(school.LONGITUDE);
            const name = school.NO_ENTIDADE;
            
            if (!isNaN(lat) && !isNaN(lon)) {
                this.addSchoolMarker(lat, lon, name);
                this.selectedSchools.push(school);
            }
        });

        // Notificar cambio de selección
        this.updateSelection(this.selectedSchools);
    }

    // Manejar clic en estado
    private handleStateClick(event: MouseEvent, d: any): void {
        if (!this.path || !this.GG) return;

        const bounds = this.path.bounds(d);
        const [[x0, y0], [x1, y1]] = bounds;
        event.stopPropagation();

        // Zoom al estado
        const transform = d3.zoomIdentity
            .translate(this.width / 2, this.height / 2)
            .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / this.width, (y1 - y0) / this.height)))
            .translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
        
        this.GG.transition()
            .duration(750)
            .attr("transform", transform.toString());

        // Cargar escuelas del estado
        this.loadSchoolsForState(d.properties.name);
    }

    // Resetear zoom
    private reset(): void {
        if (!this.GG) return;

        this.GG.transition()
            .duration(750)
            .attr("transform", d3.zoomIdentity.toString());
    }

    // Crear el mapa
    public createMapPlot(): void {
        // Verificar que tengamos datos geográficos
        if (!this.geoData || !this.geoData.features) {
            console.error("No hay datos geográficos disponibles");
            d3.select(this.el)
                .append("div")
                .style("padding", "20px")
                .style("color", "red")
                .html("<strong>Error:</strong> No se cargaron los datos geográficos del mapa.");
            return;
        }

        // Limpiar el contenedor
        d3.select(this.el).selectAll("*").remove();

        // Crear SVG
        const svg = d3.select(this.el)
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("class", "mapplot-svg");

        // Grupo principal (afectado por zoom)
        this.GG = svg.append("g");

        // Grupo para elementos del mapa
        this.g = this.GG.append("g");

        // Configurar proyección
        this.projection = d3.geoMercator()
            .scale(800)
            .center([-55, -15])
            .translate([this.width / 2, this.height / 2]);

        this.path = d3.geoPath().projection(this.projection);

        // Configurar comportamiento de zoom
        const zoomBehavior = d3.zoom<SVGGElement, unknown>()
            .scaleExtent([1, 8])
            .on("zoom", (event) => {
                if (this.g) {
                    this.g.attr("transform", event.transform.toString());
                }
            });

        this.GG.call(zoomBehavior);

        // Crear estados del mapa
        const states = this.g
            .selectAll("path")
            .data(this.geoData.features)
            .enter()
            .append("path")
            .attr("d", this.path as any)
            .attr("fill", "#cce5df")
            .attr("stroke", "#333")
            .on("click", (event, d) => this.handleStateClick(event, d));

        // Agregar tooltips con nombres de estados
        states.append("title")
            .text((d: any) => d.properties.name);
    }

    public render(): void {
        this.createMapPlot();
    }

    public destroy(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
    }
}

function render({ el, model }: RenderProps<MapPlotModel>): (() => void) | void {
    let mapplot = new MapPlot(el, model);

    // Listeners para cambios en los traitlets de Python
    const rerender = () => {
        if (mapplot) {
            mapplot.destroy();
        }
        mapplot = new MapPlot(el, model);
    };

    model.on("change:data", rerender);
    model.on("change:geo_data", rerender);

    return () => {
        if (mapplot) {
            mapplot.destroy();
        }
    };
}

export default { render };