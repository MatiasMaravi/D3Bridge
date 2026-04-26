import type { AnyModel } from "@anywidget/types";
import * as d3 from "d3";

const MARGIN = { top: 20, right: 20, bottom: 40, left: 30 };
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;
const DEFAULT_SINGLE_HEIGHT = 200;

const colors = [
    { r: 17, g: 102, b: 255 },
    { r: 255, g: 51, b: 51 },
];

function invertedSort(property: string) {
    if (property[0] === "-") {
        property = property.substring(1);
    }

    return function (a: any, b: any) {
        let result;
        if (a[property] < 0 && b[property] >= 0) {
            result = 1;
        } else if (a[property] >= 0 && b[property] < 0) {
            result = -1;
        } else {
            result = a[property] > b[property] ? 1 : a[property] < b[property] ? -1 : 0;
        }
        return result;
    }
}

function absoluteSort(property: string, ascending: boolean) {
    function arrayAbsSum(array: number[]) {
        let sum = 0;
        array.forEach((i) => (sum += Math.abs(i)));
        return sum;
    }

    let order = 1;
    if (ascending) order = -1;
    var sortOrder = 1;
    if (property[0] === "-") {
        sortOrder = -1;
        property = property.substring(1);
    }
    return function (a: any, b: any) {
        var result =
            arrayAbsSum(a[property]) < arrayAbsSum(b[property])
                ? order
                : arrayAbsSum(a[property]) > arrayAbsSum(b[property])
                    ? order * -1
                    : 0;
        return result * sortOrder;
    };
}
// Helper to measure text width without rendering it in the DOM (very fast)
function getTextWidth(text: string) {
    const fontSize = "12px";
    const fontFamily = "sans-serif";
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (context) {
        context.font = `${fontSize} ${fontFamily}`;
        return context.measureText(text).width;
    }
    return 0;
}
function get_color(value:number):string{
    return [
        "rgb(",
        value * colors[1].r + (1 - value) * colors[0].r,
        ",",
        value * colors[1].g + (1 - value) * colors[0].g,
        ",",
        value * colors[1].b + (1 - value) * colors[0].b,
        ")"
    ].join("");
}

interface ShapMultiRecord {
    feature_names: string;
    values: number[];
    data: number[];
}

interface ShapRecord {
    feature_names: string;
    values: number;
    data: number;
}

interface FilteredShapMultiRecord {
    feature_names: string;
    values: number[];
    data: number[];
    base_values: number;
}

interface ShapMultiModel{
    data: ShapMultiRecord[];
    base_value: number;
    selected_values_records?: FilteredShapMultiRecord[];
}
interface ShapModel{
    data: ShapRecord[];
    base_value: number;
    selected_values_records?: ShapRecord[];
}
interface PathPoint {
    x: number;
    y: number;
    index?: number;
    feature_names?: string;
}

class ShapMultiPlot {
    protected el!: HTMLElement;
    protected model!: AnyModel<ShapMultiModel>;
    protected width: number;
    protected height: number;
    protected resizeObserver: ResizeObserver;
    protected all_paths: d3.Selection<SVGPathElement, PathPoint[], null, undefined>[] = [];
    protected selected_paths: number[] = [];

    constructor(el: HTMLElement, model: AnyModel<ShapMultiModel>) {
        this.el = el;
        this.model = model;
        this.width = this.el.clientWidth || DEFAULT_WIDTH;
        this.height = DEFAULT_HEIGHT;

        this.resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const newWidth = entry.contentRect.width;
                if (newWidth > 0 && Math.abs(newWidth - this.width) > 5) {
                    this.width = newWidth;
                    this.render();
                }
            }
        });
        this.resizeObserver.observe(this.el);
    }
    protected set_selected_values(values: FilteredShapMultiRecord[]){
        this.model.set("selected_values_records", values);
        this.model.save_changes();
    }
    protected call_update_selected(data: ShapMultiRecord[], base_value: number){
        this.all_paths.forEach((path) => path.classed("selected",this.selected_paths.includes(path.data()[0][0].index!)));
        const filteredData: FilteredShapMultiRecord[] = data.map((d) => {
            return {
                "feature_names": d["feature_names"],
                "values": this.selected_paths.map((i) => d["values"][i]),
                "data": this.selected_paths.map((i) => d["data"][i]),
                "base_values": base_value
            }
        });
        this.set_selected_values(filteredData);
    };
    // Method to render that will be overridden by child classes
    public render() {}
}

class ShapPlot {
    protected el!: HTMLElement;
    protected model!: AnyModel<ShapModel>;
    protected width: number;
    protected height: number;
    protected resizeObserver: ResizeObserver;
    protected all_paths: d3.Selection<SVGPathElement, PathPoint[], null, undefined>[] = [];
    protected selected_paths: number[] = [];

    constructor(el: HTMLElement, model: AnyModel<ShapModel>) {
        this.el = el;
        this.model = model;
        this.width = this.el.clientWidth || DEFAULT_WIDTH;
        this.height = DEFAULT_SINGLE_HEIGHT;

        this.resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const newWidth = entry.contentRect.width;
                if (newWidth > 0 && Math.abs(newWidth - this.width) > 5) {
                    this.width = newWidth;
                    this.render();
                }
            }
        });
        this.resizeObserver.observe(this.el);
    }
    protected set_selected_values(values: ShapRecord[]){
        this.model.set("selected_values_records", values);
        this.model.save_changes();
    }

    // Method to render that will be overridden by child classes
    public render() {}
}

export { MARGIN,
    DEFAULT_HEIGHT,
    DEFAULT_SINGLE_HEIGHT,
    colors, 
    absoluteSort,
    invertedSort,
    getTextWidth,
    get_color,
    ShapPlot,
    ShapMultiPlot
};
export type { ShapModel, ShapRecord, ShapMultiModel,ShapMultiRecord, PathPoint };