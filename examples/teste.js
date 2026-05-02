
import * as d3 from "https://esm.sh/d3@7";


function render({ model, el }) {
    let element;
    let width;
    let height = 400;
    let resizeObserver;
    let initialized = false;
    let lastWidth = 0;
    let resizeTimeout = null;

    // Configure container styles with FIXED height for Jupyter cell
    el.style.width = "100%";
    el.style.height = "400px";
    el.style.overflow = "hidden";
    el.style.position = "relative";

    function getElement() {
        const elementId = model.get("elementId");
        return elementId ? document.getElementById(elementId) : el;
    }

    function updateSizes() {
        element = getElement();
        if (!element) return false;
        
        width = element.clientWidth || element.offsetWidth;
        // Fixed height, we do not depend on content
        height = 400;
        
        return width > 0;
    }

    function replot() {
        if (!element || !updateSizes()) return;
        element.innerHTML = "";

					const data = model.get("data");


        plot(data);
    }

    function initializeWidget() {
        if (initialized) return;
        
        element = getElement();
        if (!element || !updateSizes()) return;

        initialized = true;
        lastWidth = width;

        // Register model changes
					model.on("change:data", replot);


        // Initial render
					const data = model.get("data");

        plot(data);
    }

    // Use ResizeObserver only to detect WIDTH changes
    resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const newWidth = entry.contentRect.width;
            
            if (newWidth > 0) {
                if (!initialized) {
                    initializeWidget();
                } else if (Math.abs(newWidth - lastWidth) > 5) {
                    // Only re-render if width changed significantly
                    lastWidth = newWidth;
                    
                    // Debounce to avoid multiple renders
                    if (resizeTimeout) clearTimeout(resizeTimeout);
                    resizeTimeout = setTimeout(() => {
                        replot();
                    }, 150);
                }
            }
        }
    });

    // Observe container element
    resizeObserver.observe(el);

    // Fallback: try to initialize if element already has size
    requestAnimationFrame(() => {
        if (!initialized && updateSizes()) {
            initializeWidget();
        }
    });

    function plot(sales){

  const marginTop = 30;
  const marginRight = -1;
  const marginBottom = -1;
  const marginLeft = 1;

  // Create the color scale.
  const color = d3.scaleOrdinal(d3.schemeCategory10).domain(sales.map(d => d.segment));

  d3.select(element).selectAll("*").remove();
  // Compute the layout.
  const treemap = data => d3.treemap()
      .round(true)
      .tile(d3.treemapSliceDice)
      .size([
        width - marginLeft - marginRight, 
        height - marginTop - marginBottom
      ])
    (d3.hierarchy(d3.group(data, d => d.market, d => d.segment)).sum(d => d.value))
    .each(d => {
      d.x0 += marginLeft;
      d.x1 += marginLeft;
      d.y0 += marginTop;
      d.y1 += marginTop;
    });
  const root = treemap(sales);

  // Create the SVG container.
  const svg = d3.select(element)
      .append("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("width", width)
      .attr("height", height)
      .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

  // Position the nodes.
  const node = svg.selectAll("g")
    .data(root.descendants())
    .join("g")
      .attr("transform", d => `translate(${d.x0},${d.y0})`);

  const format = d => d.toLocaleString();

  // Draw column labels.
  const column = node.filter(d => d.depth === 1);

  column.append("text")
      .attr("x", 3)
      .attr("y", "-1.7em")
      .style("font-weight", "bold")
      .text(d => d.data[0]);

  column.append("text")
      .attr("x", 3)
      .attr("y", "-0.5em")
      .attr("fill-opacity", 0.7)
      .text(d => format(d.value));

  column.append("line")
      .attr("x1", -0.5)
      .attr("x2", -0.5)
      .attr("y1", -30)
      .attr("y2", d => d.y1 - d.y0)
      .attr("stroke", "#000")

  // Draw leaves.
  const cell = node.filter(d => d.depth === 2);

  cell.append("rect")
      .attr("fill", d => color(d.data[0]))
      .attr("fill-opacity", (d, i) => d.value / d.parent.value)
      .attr("width", d => d.x1 - d.x0 - 1)
      .attr("height", d => d.y1 - d.y0 - 1);

  cell.append("text")
      .attr("x", 3)
      .attr("y", "1.1em")
      .text(d => d.data[0]);

  cell.append("text")
      .attr("x", 3)
      .attr("y", "2.3em")
      .attr("fill-opacity", 0.7)
      .text(d => format(d.value));


}
}

export default { render };
        