
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
					const x = model.get("x");
					const y = model.get("y");
					const pallete = model.get("pallete");


        plot(data, x, y, pallete);
    }

    function initializeWidget() {
        if (initialized) return;
        
        element = getElement();
        if (!element || !updateSizes()) return;

        initialized = true;
        lastWidth = width;

        // Registrar cambios en el modelo
					model.on("change:data", replot);
					model.on("change:x", replot);
					model.on("change:y", replot);
					model.on("change:pallete", replot);


        // Renderizar inicialmente
					const data = model.get("data");
					const x = model.get("x");
					const y = model.get("y");
					const pallete = model.get("pallete");

        plot(data, x, y, pallete);
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

    function plot(data,x_,y_,pallete) {
    console.log("Pallete:", pallete);
  // Usar dimensiones del contenedor
  const marginTop = 30;
  const marginRight = 20;
  const marginBottom = 30;
  const marginLeft = 40;

  // Limpiar el contenedor
  d3.select(element).selectAll("*").remove();

  // Declare the x (horizontal position) scale.
  const x = d3.scaleBand()
      .domain(d3.groupSort(data, ([d]) => -d[y_], (d) => d[x_])) // descending frequency
      .range([marginLeft, width - marginRight])
      .padding(0.1);
  
  // Declare the y (vertical position) scale.
  const y = d3.scaleLinear()
      .domain([0, d3.max(data, (d) => d[y_])])
      .range([height - marginBottom, marginTop]);

  // Create the SVG container.
  const svg = d3.select(element)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");

  // Add a rect for each bar.
  svg.append("g")
    .selectAll()
    .data(data)
    .join("rect")
      .attr("x", (d) => x(d[x_]))
      .attr("y", (d) => y(d[y_]))
      .attr("height", (d) => y(0) - y(d[y_]))
      .attr("width", x.bandwidth())
      .attr("fill", (d, i) => pallete[i % pallete.length]);

  // Add the x-axis and label.
  svg.append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x).tickSizeOuter(0));

  // Add the y-axis and label, and remove the domain line.
  svg.append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y).tickFormat((y) => (y * 100).toFixed()))
      .call(g => g.select(".domain").remove())
      .call(g => g.append("text")
          .attr("x", -marginLeft)
          .attr("y", 10)
          .attr("fill", "currentColor")
          .attr("text-anchor", "start")
          .text("↑ Frequency (%)"));
}
}

export default { render };
        