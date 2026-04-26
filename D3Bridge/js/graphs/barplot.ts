import type { RenderProps } from "@anywidget/types";
import { BaseModel, BasePlot } from "./base_plot";
    
import * as d3 from "d3";
import "./barplot.css";

class BarPlot extends BasePlot {
    // Prepare Aggregated Data for Bar Plot (mean and standard deviation)
    private prepareData(): { category: string; value: number; hue?: string; sd?: number }[] {
        const x_ = this.model.get("x");
        const y_ = this.model.get("y");
        const hue_ = this.model.get("hue");
        const data = this.model.get("data") || [];

        let result: { category: string; value: number; hue?: string; sd?: number }[] = [];

        if (hue_) {
             const grouped = d3.group(data, (d) => d[x_], (d) => d[hue_]);
             grouped.forEach((hueMap, category) => {
                hueMap.forEach((values, hue) => {
                    const mean = d3.mean(values, (d) => +d[y_]) || 0;
                    const sd = d3.deviation(values, (d) => +d[y_]) || 0;
                    result.push({ category: String(category), value: mean, hue: String(hue), sd: sd });
                });
            });
        } else {
            // Without hue
            const grouped = d3.group(data, (d) => d[x_]);
            
            result = Array.from(grouped, ([category, values]) => ({
                category: String(category),
                value: d3.mean(values, (d) => +d[y_]) || 0,
                sd: d3.deviation(values, (d) => +d[y_]) || 0
            }));
        }

        return result;
    }

    // Get unique categories
    private getCategories(): string[] {
        const data = this.model.get("data") || [];
        const x_ = this.model.get("x");
        const unique = [...new Set(data.map((d) => String(d[x_])))];
        
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

    // Get unique values for the hue variable
    private getHueValues(): string[] {
        const hue_ = this.model.get("hue");
        if (!hue_) return [];
        const data = this.model.get("data") || [];
        return [...new Set(data.map((d) => String(d[hue_])))];
    }

    public createVerticalBarPlot(): void {
        const preparedData = this.prepareData();
        const categories = this.getCategories();
        const hueValues = this.getHueValues();

        // Create SVG using the inherited method
        this.createSvg("barplot-svg");

        const palette = this.model.get("palette") || d3.schemeCategory10;
        const y_ = this.model.get("y") || "";
        const hue_ = this.model.get("hue") || "";

        // X Scale (categories)
        const xScale = d3.scaleBand()
            .domain(categories)
            .range([0, this.innerWidth])
            .padding(0.2);

        // X Scale for subgroups (hue)
        const xSubScale = d3.scaleBand()
            .domain(hueValues.length > 0 ? hueValues : ["default"])
            .range([0, xScale.bandwidth()])
            .padding(0.05);

        // Y Scale (numeric values)
        const maxValue = d3.max(preparedData, d => d.value + (d.sd || 0)) || 0;
        const yScale = d3.scaleLinear()
            .domain([0, maxValue * 1.1])
            .nice()
            .range([this.innerHeight, 0]);

        // Color Scale
        const colorScale = d3.scaleOrdinal<string>()
            .domain(hueValues.length > 0 ? hueValues : ["default"])
            .range(palette);

        // Create axes using inherited methods
        this.createXAxis(xScale, undefined, true);
        this.createYAxis(yScale, y_ || "Y Axis");

        // Draw bars
        if (hue_) {
            // With grouping by hue
            const categoryGroups = this.g!.selectAll(".category-group")
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
            
            // Lines for standard deviation
            groups.append("line")
                .attr("class", "error-line")
                .attr("x1", xSubScale.bandwidth() / 2)
                .attr("x2", xSubScale.bandwidth() / 2)
                .attr("y1", d => yScale(d.value - (d.sd || 0)))
                .attr("y2", d => yScale(d.value + (d.sd || 0)))
                .attr("stroke", "black")
                .attr("stroke-width", 1.5);


        } else {
            // Without hue
            const bars = this.g!.selectAll(".bar-group")
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
                .attr("fill", (_d, i) => palette[i % palette.length]);

            // LLines for standard deviation
            bars.append("line")
                .attr("class", "error-line")
                .attr("x1", xScale.bandwidth() / 2)
                .attr("x2", xScale.bandwidth() / 2)
                .attr("y1", d => yScale(d.value - (d.sd || 0)))
                .attr("y2", d => yScale(d.value + (d.sd || 0)))
                .attr("stroke", "black")
                .attr("stroke-width", 1.5);

        }

        // Legend if hue is specified
        if (hue_ && hueValues.length > 0) {
            this.createLegend(hueValues, colorScale);
        }
    }

    public createHorizontalBarPlot(): void {
        const preparedData = this.prepareData();
        const categories = this.getCategories();
        const hueValues = this.getHueValues();

        // Create SVG using the inherited method
        this.createSvg("barplot-svg");

        const palette = this.model.get("palette") || d3.schemeCategory10;
        const y_ = this.model.get("y") || "";
        const hue_ = this.model.get("hue") || "";

        // Y Scale (categories - horizontal, categories go on Y)
        const yScale = d3.scaleBand()
            .domain(categories)
            .range([0, this.innerHeight])
            .padding(0.2);

        // Y Scale for subgroups (hue)
        const ySubScale = d3.scaleBand()
            .domain(hueValues.length > 0 ? hueValues : ["default"])
            .range([0, yScale.bandwidth()])
            .padding(0.05);

        // X Scale (numeric values - horizontal, values go on X)
        const maxValue = d3.max(preparedData, d => d.value + (d.sd || 0)) || 0;
        const xScale = d3.scaleLinear()
            .domain([0, maxValue * 1.1])
            .nice()
            .range([0, this.innerWidth]);

        // Color Scale
        const colorScale = d3.scaleOrdinal<string>()
            .domain(hueValues.length > 0 ? hueValues : ["default"])
            .range(palette);

        // Draw horizontal bars
        if (hue_) {
            // With grouping by hue
            const categoryGroups = this.g!.selectAll(".category-group")
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

            // Lines for standard deviation
            groups.append("line")
                .attr("class", "error-line")
                .attr("x1", d => xScale(d.value - (d.sd || 0)))
                .attr("x2", d => xScale(d.value + (d.sd || 0)))
                .attr("y1", ySubScale.bandwidth() / 2)
                .attr("y2", ySubScale.bandwidth() / 2)
                .attr("stroke", "black")
                .attr("stroke-width", 1);


        } else {
            // Without hue
            const bars = this.g!.selectAll(".bar-group")
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
                .attr("fill", (_d, i) => palette[i % palette.length]);

             // Lines for standard deviation
             bars.append("line")
                .attr("class", "error-line")
                .attr("x1", d => xScale(d.value - (d.sd || 0)))
                .attr("x2", d => xScale(d.value + (d.sd || 0)))
                .attr("y1", yScale.bandwidth() / 2)
                .attr("y2", yScale.bandwidth() / 2)
                .attr("stroke", "black")
                .attr("stroke-width", 1);

        }

        // Create axes using inherited methods
        this.createXAxis(xScale, y_ || "X Axis");
        this.createYAxis(yScale);

        // Legend if hue is specified
        if (hue_ && hueValues.length > 0) {
            this.createLegend(hueValues, colorScale);
        }
    }

    public render(): void {
        const direction_ = this.model.get("direction");
        if (direction_ === "vertical") {
            this.createVerticalBarPlot();
        } else {
            this.createHorizontalBarPlot();
        }
    }
}

function render({ el, model }: RenderProps<BaseModel>) {
    let barPlot = new BarPlot(el, model);
    barPlot.render();

    model.on("change:x", () => barPlot.render());
    model.on("change:y", () => barPlot.render());
    model.on("change:hue", () => barPlot.render());
    model.on("change:direction", () => barPlot.render());
    model.on("change:palette", () => barPlot.render());
    model.on("change:data", () => barPlot.render());
}

export default {render};
