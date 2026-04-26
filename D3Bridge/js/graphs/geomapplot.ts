import type { AnyModel,RenderProps } from "@anywidget/types";
import * as d3 from "d3";
import "./geomapplot.css";
const MARGIN = { top: 20, right: 20, bottom: 40, left: 30 };
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

// Supported D3.js standard projections
export type D3ProjectionType = 
    | "azimuthalEqualArea"
    | "azimuthalEquidistant"
    | "gnomonic"
    | "orthographic"
    | "stereographic"
    | "equalEarth"
    | "albers"
    | "albersUsa"
    | "conicConformal"
    | "conicEqualArea"
    | "conicEquidistant"
    | "equirectangular"
    | "mercator"
    | "transverseMercator"
    | "naturalEarth1";

// Interfaces to type the dynamic configuration
export interface MapConfig {
    projectionType?: D3ProjectionType;
    fillColor?: string | ((d: any) => string); // Can be static or an accessor function
    strokeColor?: string;
    strokeWidth?: number;
    hoverFillColor?: string;
    labelProperty?: string; // E.g., "name", "STATE", "department"
}

export interface GeoMapModel {
    geojson: GeoJSON.FeatureCollection;
    config: MapConfig;
    selected_region?: string; // To store the selected region on click events
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

        // Initial dimensions (will be updated by the ResizeObserver)
        this.width = this.el.clientWidth || DEFAULT_WIDTH;
        this.height = DEFAULT_HEIGHT;

        // Configure ResizeObserver to automatically adjust the width
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

        // Ensure the container has relative positioning for the tooltip
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
        
        // 1. Configure the requested D3 projection
        let projectionBase: d3.GeoProjection;
        switch (config.projectionType) {
            case "albersUsa": projectionBase = d3.geoAlbersUsa(); break;
            case "azimuthalEqualArea": projectionBase = d3.geoAzimuthalEqualArea(); break;
            case "azimuthalEquidistant": projectionBase = d3.geoAzimuthalEquidistant(); break;
            case "gnomonic": projectionBase = d3.geoGnomonic(); break;
            case "orthographic": projectionBase = d3.geoOrthographic(); break;
            case "stereographic": projectionBase = d3.geoStereographic(); break;
            case "equalEarth": projectionBase = d3.geoEqualEarth(); break;
            case "albers": projectionBase = d3.geoAlbers(); break;
            case "conicConformal": projectionBase = d3.geoConicConformal(); break;
            case "conicEqualArea": projectionBase = d3.geoConicEqualArea(); break;
            case "conicEquidistant": projectionBase = d3.geoConicEquidistant(); break;
            case "equirectangular": projectionBase = d3.geoEquirectangular(); break;
            case "transverseMercator": projectionBase = d3.geoTransverseMercator(); break;
            case "naturalEarth1": projectionBase = d3.geoNaturalEarth1(); break;
            case "mercator":
            default:
                projectionBase = d3.geoMercator(); 
                break;
        }

        // 2. fitSize automatically calculates the ideal scale and translate for the given GeoJSON
        const projection = projectionBase.fitSize([innerWidth, innerHeight], geojson);
        const pathGenerator = d3.geoPath().projection(projection);

        // 3. Generalized zoom
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([1, 8])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });
        
        svg.call(zoom);

        // 4. Draw polygons using the dynamic configuration
        // Create tooltip
        const tooltip = d3.select(this.el)
            .append("div")
            .attr("class", "map-tooltip")
            .style("opacity", 0);

        const currentSelected = this.model.get("selected_region") || "";

        const paths = g.selectAll(".region")
            .data(geojson.features)
            .enter()
            .append("path")
            .attr("class", "region map-region") // Explicitly add .map-region
            .attr("d", pathGenerator as any)
            .attr("fill", (d: any) => {
                // If selected, CSS handles the color
                const label = config.labelProperty && d.properties 
                    ? d.properties[config.labelProperty!] 
                    : "";
                if (currentSelected && label === currentSelected) {
                    return "#ffcc00"; // Selection color
                }
                return typeof config.fillColor === "function" 
                    ? config.fillColor(d) 
                    : (config.fillColor || "#cce5df");
            })
            .attr("stroke", config.strokeColor || "#333")
            .attr("stroke-width", config.strokeWidth || 1)
            .style("cursor", "pointer")
            .classed("selected", (d: any) => {
                // Only mark as selected if there is a valid selected region
                if (!currentSelected) return false;
                const label = config.labelProperty && d.properties 
                    ? d.properties[config.labelProperty!] 
                    : "";
                return label !== "" && label === currentSelected;
            });

        // 5. Interaction: hover and tooltip
        const self = this;
        paths.on("mouseover", function(_event, d: any) {
            // Get the label for the tooltip
            let label = "";
            if (config.labelProperty && d.properties) {
                label = d.properties[config.labelProperty] || "";
            }
            
            // Show tooltip if label exists
            if (label) {
                tooltip
                    .style("opacity", 1)
                    .html(label);
            }

            // Hover fill (only if not selected)
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
            // Hide tooltip
            tooltip.style("opacity", 0);

            // Restore the original color only if not selected
            if (!d3.select(this).classed("selected")) {
                const originalFill = typeof config.fillColor === "function" 
                    ? config.fillColor(d) 
                    : (config.fillColor || "#cce5df");
                d3.select(this).attr("fill", originalFill);
            }
        });

        // 6. Click event handling
        paths.on("click", function(_event, d: any) {
            // Get the label of the clicked region
            let label = "";
            if (config.labelProperty && d.properties) {
                label = d.properties[config.labelProperty] || "";
            }
            
            // If no labelProperty is configured, we cannot identify the region
            if (!label) {
                console.warn("GeoMapPlot: No labelProperty configured or property not found");
                return;
            }

            // Clear previous visual selection
            paths.classed("selected", false);
            
            // Restore colors of all elements
            paths.attr("fill", (d_item: any) => typeof config.fillColor === "function" 
                ? config.fillColor(d_item) 
                : (config.fillColor || "#cce5df"));

            // Mark new selection
            d3.select(this).classed("selected", true);
            d3.select(this).attr("fill", "#ffcc00"); // Selection color
            
            // Update model and synchronize with Python
            self.model.set("selected_region", label);
            self.model.save_changes();
            
        });
    }
}

function render({ el, model }: RenderProps<GeoMapModel>): (() => void) | void {
    let mapPlot = new GeoMapPlot(el, model);
    mapPlot.render();

    // Listen for changes in both geographic data and configuration
    model.on("change:geojson", () => {
        mapPlot.render();
    });
    model.on("change:config", () => {
        mapPlot.render();
    });
}

export default { render };