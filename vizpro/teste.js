
import * as d3 from "https://esm.sh/d3@7";


function render({ model, el }) {
    let element;
    let width;
    let height = 400;
    let resizeObserver;
    let initialized = false;
    let lastWidth = 0;
    let resizeTimeout = null;

    // Configurar estilos del contenedor con altura FIJA para celda Jupyter
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
        // Altura fija, no dependemos del contenido
        height = 400;
        
        return width > 0;
    }

    function replot() {
        if (!element || !updateSizes()) return;
        element.innerHTML = "";

					const data = model.get("data");
					const metric = model.get("metric");


        plot(data, metric);
    }

    function initializeWidget() {
        if (initialized) return;
        
        element = getElement();
        if (!element || !updateSizes()) return;

        initialized = true;
        lastWidth = width;

        // Registrar cambios en el modelo
					model.on("change:data", replot);
					model.on("change:metric", replot);


        // Renderizar inicialmente
					const data = model.get("data");
					const metric = model.get("metric");

        plot(data, metric);
    }

    // Usar ResizeObserver solo para detectar cambios de ANCHO
    resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const newWidth = entry.contentRect.width;
            
            if (newWidth > 0) {
                if (!initialized) {
                    initializeWidget();
                } else if (Math.abs(newWidth - lastWidth) > 5) {
                    // Solo re-renderizar si el ancho cambió significativamente
                    lastWidth = newWidth;
                    
                    // Debounce para evitar múltiples renders
                    if (resizeTimeout) clearTimeout(resizeTimeout);
                    resizeTimeout = setTimeout(() => {
                        replot();
                    }, 150);
                }
            }
        }
    });

    // Observar el elemento contenedor
    resizeObserver.observe(el);

    // Fallback: intentar inicializar si el elemento ya tiene tamaño
    requestAnimationFrame(() => {
        if (!initialized && updateSizes()) {
            initializeWidget();
        }
    });

    function plot(data,metric){

  const data_2 = d3.sort(data, d => d[2019] - d[2010])
    .map((d) => ({
      ...d,
      value:metric === "absolute" ? d[2019] - d[2010] : (d[2019] - d[2010]) / d[2010]
    }));
  
  const marginTop = 30;
  const marginRight = 60;
  const marginBottom = 10;
  const marginLeft = 60;

  d3.select(element).selectAll("*").remove();

  const x = d3.scaleLinear()
    .domain(d3.extent(data_2, d => d.value))
    .rangeRound([marginLeft, width - marginRight]);

  const y = d3.scaleBand()
    .domain(data_2.map(d => d.State))
    .rangeRound([marginTop, height - marginBottom])
    .padding(0.1);

  // Create the format function.
  const format = d3.format(metric === "absolute" ? "+,d" : "+.1%");
  const tickFormat = metric === "absolute" ? d3.formatPrefix("+.1", 1e6) : d3.format("+.0%");

  const svg = d3.select(element)
      .append("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

  svg.append("g")
    .selectAll()
    .data(data_2)
    .join("rect")
      .attr("fill", (d) => d3.schemeRdBu[3][d.value > 0 ? 2 : 0])
      .attr("x", (d) => x(Math.min(d.value, 0)))
      .attr("y", (d) => y(d.State))
      .attr("width", d => Math.abs(x(d.value) - x(0)))
      .attr("height", y.bandwidth());

  svg.append("g")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10)
    .selectAll()
    .data(data_2)
    .join("text")
      .attr("text-anchor", d => d.value < 0 ? "end" : "start")
      .attr("x", (d) => x(d.value) + Math.sign(d.value - 0) * 4)
      .attr("y", (d) => y(d.State) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .text(d => format(d.value));

  svg.append("g")
    .attr("transform", `translate(0,${marginTop})`)
    .call(d3.axisTop(x).ticks(width / 80).tickFormat(tickFormat))
    .call(g => g.selectAll(".tick line").clone()
          .attr("y2", height - marginTop - marginBottom)
          .attr("stroke-opacity", 0.1))
    .call(g => g.select(".domain").remove());

  svg.append("g")
    .attr("transform", `translate(${x(0)},0)`)
    .call(d3.axisLeft(y).tickSize(0).tickPadding(6))
    .call(g => g.selectAll(".tick text").filter((d, i) => data_2[i].value < 0)
        .attr("text-anchor", "start")
        .attr("x", 6));

}
}

export default { render };
        