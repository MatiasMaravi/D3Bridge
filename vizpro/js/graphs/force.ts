import type { RenderProps } from "@anywidget/types";
import * as d3 from "d3";
import { MARGIN, invertedSort, ShapPlot } from "./shap_plot";
import type { ShapModel, ShapRecord } from "./shap_plot";
import "./force.css";

const NEGATIVE_COLOR = "#33AFFF";
const NEGATIVE_SELECTED_COLOR = "#039AFC";
const POSITIVE_COLOR = "#FF335B";
const POSITIVE_SELECTED_COLOR = "#FF0334";
const GRAPH_Y = 100;
const GRAPH_HEIGHT = 40;

function get_color_2(start: number, end: number) {
    const value = end - start;
    if (value >= 0) return POSITIVE_COLOR;
    return NEGATIVE_COLOR;
}

function findResultingValue(data: ShapRecord[], baseValue: number) {
    let value = baseValue;
    data.forEach((d) => (value += d["values"]));
    return value;
}

function getScaledPolygon(start: number, end: number, x_scale: d3.ScaleLinear<number, number>, transition: boolean) {
    const x = x_scale(start);
    const y = GRAPH_Y;
    const lenght = Math.abs(x_scale(end) - x_scale(0));
    let TRI_HEIGHT = 10;
    const HALF_HEIGHT = GRAPH_HEIGHT / 2;
    let polygon;
    if (lenght < 0) TRI_HEIGHT = -TRI_HEIGHT;

    if (transition) {
        polygon = [
            { x: x, y: y + HALF_HEIGHT },
            { x: x + lenght, y: y + HALF_HEIGHT },
            { x: x + lenght - TRI_HEIGHT, y: y },
            { x: x + lenght, y: y - HALF_HEIGHT },
            { x: x, y: y - HALF_HEIGHT },
        ];
    } else if (end > 0) {
        polygon = [
            { x: x, y: y + HALF_HEIGHT },
            { x: x + lenght, y: y + HALF_HEIGHT },
            { x: x + lenght + TRI_HEIGHT, y: y },
            { x: x + lenght, y: y - HALF_HEIGHT },
            { x: x, y: y - HALF_HEIGHT },
            { x: x + TRI_HEIGHT, y: y },
        ];
    } else {
        polygon = [
            { x: x, y: y + HALF_HEIGHT },
            { x: x + lenght, y: y + HALF_HEIGHT },
            { x: x + lenght - TRI_HEIGHT, y: y },
            { x: x + lenght, y: y - HALF_HEIGHT },
            { x: x, y: y - HALF_HEIGHT },
            { x: x - TRI_HEIGHT, y: y },
        ];
    }

    return polygon;
}

function getPolygon(start: number, end: number, lenght: number, x_value: number) {
    let x = start;
    const y = GRAPH_Y;
    let TRI_HEIGHT = 10;
    const HALF_HEIGHT = GRAPH_HEIGHT / 2;
    let polygon;
    if (lenght < 0) TRI_HEIGHT = -TRI_HEIGHT;

    if (x_value > 0) {
        x = x - 1;
        end = end - 1;
        polygon = [
            { x: x, y: y + HALF_HEIGHT },
            { x: x + lenght, y: y + HALF_HEIGHT },
            { x: x + lenght + TRI_HEIGHT, y: y },
            { x: x + lenght, y: y - HALF_HEIGHT },
            { x: x, y: y - HALF_HEIGHT },
            { x: x + TRI_HEIGHT, y: y },
        ];
    } else {
        x = x + 1;
        end = end + 1;
        polygon = [
            { x: end - lenght, y: y + HALF_HEIGHT },
            { x: end, y: y + HALF_HEIGHT },
            { x: end - TRI_HEIGHT, y: y },
            { x: end, y: y - HALF_HEIGHT },
            { x: end - lenght, y: y - HALF_HEIGHT },
            { x: end - lenght - TRI_HEIGHT, y: y },
        ];
    }

    return polygon;
}


class Force extends ShapPlot {
    private get_domain(data: ShapRecord[], base_value: number) {
        let min = base_value;
        let max = base_value;

        data.forEach((d) => {
            const value = d["values"];
            if (value < 0) min += value;
            if (value > 0) max += value;
        });

        return [min, max];
    }
    public render() {
        // 1. Limpieza previa
        d3.select(this.el).selectAll("*").remove();

        const data = this.model.get("data");

        const base_value = this.model.get("base_value");

        const innerWidth = this.width - MARGIN.right - MARGIN.left;

        data.sort(invertedSort("values"));

        let zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([1, 50])
            .extent([
                [0, 0],
                [this.width, this.height],
            ])
            .translateExtent([
                [0, 0],
                [this.width, this.height],
            ])
            .on("zoom", onZoom);

        const x_domain = this.get_domain(data, base_value);
        const x_scale = d3.scaleLinear().domain(x_domain).range([0, innerWidth]).nice();
        const tick_values = [base_value];

        let initialValue = base_value;
        let finalValue = base_value;

        while (initialValue >= x_domain[0] || finalValue <= x_domain[1]) {
            initialValue -= 1;
            finalValue += 1;
            tick_values.push(initialValue);
            tick_values.push(finalValue);
        }
        tick_values.sort;

        const svg = d3.select(this.el)
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .call(zoom);
        const x_axis = svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(${MARGIN.left},${GRAPH_Y + GRAPH_HEIGHT})`)
            .call(
                d3.axisBottom(x_scale).tickValues(tick_values).tickFormat(d3.format(".3f"))
            )
        x_axis.append("text")
            .attr("class", "label")
            .attr("x", x_scale.range()[1])
            .attr("y", -6)
            .style("text-anchor", "end")
            .attr("fill", "black")
            .text("values")

        let startingPoint = x_domain[0];
        let lastValue = 0;
        let transition = false;

        const call_update_selected = () => {
            const svg = d3.select(this.el).select("svg");
            this.set_selected_values(svg.selectAll<SVGPolygonElement, ShapRecord>(".polygon.selected").data());
        };

        const mouseClick = (event: MouseEvent, _d: ShapRecord) => {
            const selection = d3.select(event.currentTarget as SVGPolygonElement);
            selection.classed("selected", !selection.classed("selected"));
            call_update_selected();
        }

        // Crear tooltip
        const tooltip = d3.select(this.el)
            .append("div")
            .attr("class", "force-tooltip")
            .style("opacity", 0);

        const mouseover = (event: MouseEvent, d: ShapRecord) => {
            const element = d3.select(event.currentTarget as SVGPolygonElement);
            if (d["values"] >= 0)
                element.attr("fill", POSITIVE_SELECTED_COLOR);
            else
                element.attr("fill", NEGATIVE_SELECTED_COLOR);

            tooltip
                .style("opacity", 1)
                .html(`<strong>${d["feature_names"]}</strong> = ${d["data"]} `)
                // .html(`<strong>${d["feature_names"]}</strong> = ${d["data"]}<br/>SHAP: ${d["values"].toFixed(4)}`)
                .style("left", (event.offsetX + 10) + "px")
                .style("top", (event.offsetY - 10) + "px");
        }

        const mousemove = (event: MouseEvent, _d: ShapRecord) => {
            tooltip
                .style("left", (event.offsetX + 10) + "px")
                .style("top", (event.offsetY - 10) + "px");
        }

        const mouseout = (event: MouseEvent, d: ShapRecord) => {
            const element = d3.select(event.currentTarget as SVGPolygonElement);
            if (d["values"] >= 0)
                element.attr("fill", POSITIVE_COLOR);
            else
                element.attr("fill", NEGATIVE_COLOR);

            tooltip.style("opacity", 0);
        }

        const arrows = svg.selectAll().data(data).enter().append("polygon");

        arrows.attr("points", function (d) {
            const xStart = startingPoint;
            startingPoint = startingPoint + Math.abs(d["values"]);
            transition = lastValue >= 0 && d["values"] < 0;
            lastValue = d["values"];
            return [getScaledPolygon(xStart, d["values"], x_scale, transition)].map(
                function (d) {
                    return d.map((d) => [d.x, d.y].join(",")).join(" ");
                }
            );
        })
            .attr("fill", (d) => get_color_2(0, d["values"]))
            .attr("cursor", "pointer")
            .attr("class", "polygon");

        arrows.on("click", mouseClick)
            .on("mouseover", mouseover)
            .on("mousemove", mousemove)
            .on("mouseout", mouseout);

        startingPoint = x_domain[0];

        const whiteArrows = svg.selectAll().data(data).enter().append("polygon");

        whiteArrows
            .attr("points", function (d) {
                const xStart = startingPoint;
                startingPoint = startingPoint + Math.abs(d["values"]);
                return [getPolygon(x_scale(xStart), x_scale(startingPoint), 3, d["values"])].map(
                    function (d) {
                        return d.map((d) => [d.x, d.y].join(",")).join(" ");
                    }
                );
            })
            .attr("fill", "white");

        const baseValueLine = svg.append("path")
            .attr("stroke", "grey")
            .attr("stroke-dasharray", "2,2")
            .attr(
                "d",
                d3.line()([
                    [x_scale(base_value), GRAPH_Y - GRAPH_HEIGHT],
                    [x_scale(base_value), GRAPH_Y + GRAPH_HEIGHT],
                ])
            );
        const baseValueText = svg.append("g")
            .attr("width", 80)
            .attr("height", 40)
            .attr(
                "transform",
                "translate(" +
                (x_scale(base_value) - 40) +
                ", " +
                (GRAPH_Y - 2 * GRAPH_HEIGHT) +
                ")"
            );
        baseValueText
            .append("text")
            .attr("x", 40)
            .attr("y", 20)
            .attr("dy", 1)
            .attr("dominant-baseline", "middle")
            .attr("text-anchor", "middle")
            .attr("fill", "grey")
            .text("base value");
        const resultValue = findResultingValue(data, base_value);

        const resultValueText = svg.append("g")
            .attr("width", 80)
            .attr("height", 40)
            .attr(
                "transform",
                "translate(" +
                (x_scale(resultValue) - 40) +
                ", " +
                (GRAPH_Y - 2 * GRAPH_HEIGHT + 20) +
                ")"
            );

        resultValueText
            .append("text")
            .attr("x", 40)
            .attr("y", 20)
            .attr("dy", 1)
            .attr("dominant-baseline", "middle")
            .attr("text-anchor", "middle")
            .attr("fill", "black")
            .text(Math.round(resultValue * 1000) / 1000);
        function onZoom(event: d3.D3ZoomEvent<SVGSVGElement, unknown>) {
            var newX = event.transform.rescaleX(x_scale);

            x_axis.call(d3.axisBottom(newX));

            let startingPoint = x_domain[0];
            arrows
                .attr("points", function (d) {
                    const xStart = startingPoint;
                    startingPoint = startingPoint + Math.abs(d["values"]);
                    transition = lastValue >= 0 && d["values"] < 0;
                    lastValue = d["values"];
                    return [getScaledPolygon(xStart, d["values"], newX, transition)].map(
                        function (d) {
                            return d.map((d) => [d.x, d.y].join(",")).join(" ");
                        }
                    );
                })
                .attr("fill", (d) => get_color_2(0, d["values"]));

            startingPoint = x_domain[0];
            whiteArrows
                .attr("points", function (d) {
                    const xStart = startingPoint;
                    startingPoint = startingPoint + Math.abs(d["values"]);
                    return [
                        getPolygon(newX(xStart), newX(startingPoint), 3, d["values"]),
                    ].map(function (d) {
                        return d.map((d) => [d.x, d.y].join(",")).join(" ");
                    });
                })
                .attr("fill", "white");

            baseValueLine.attr(
                "d",
                d3.line()([
                    [newX(base_value), GRAPH_Y - GRAPH_HEIGHT],
                    [newX(base_value), GRAPH_Y + GRAPH_HEIGHT],
                ])
            );

            baseValueText.attr(
                "transform",
                "translate(" +
                (newX(base_value) - 40) +
                ", " +
                (GRAPH_Y - 2 * GRAPH_HEIGHT) +
                ")"
            );

            resultValueText.attr(
                "transform",
                "translate(" +
                (newX(resultValue) - 40) +
                ", " +
                (GRAPH_Y - 2 * GRAPH_HEIGHT + 20) +
                ")"
            );
        }
    }
};

function render({ model, el }: RenderProps<ShapModel>) {
    let force = new Force(el, model);
    force.render();
    model.on("change:data", () => {
        force.render();
    });
    model.on("change:base_value", () => {
        force.render();
    });
}

export default { render };