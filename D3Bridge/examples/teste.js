
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
					const x_ = model.get("x_");
					const y_ = model.get("y_");
					const pallete = model.get("pallete");


        plot(data, x_, y_, pallete);
    }

    function initializeWidget() {
        if (initialized) return;
        
        element = getElement();
        if (!element || !updateSizes()) return;

        initialized = true;
        lastWidth = width;

        // Registrar cambios en el modelo
					model.on("change:data", replot);
					model.on("change:x_", replot);
					model.on("change:y_", replot);
					model.on("change:pallete", replot);


        // Renderizar inicialmente
					const data = model.get("data");
					const x_ = model.get("x_");
					const y_ = model.get("y_");
					const pallete = model.get("pallete");

        plot(data, x_, y_, pallete);
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

  const marginTop = 30;
  const marginRight = 20;
  const marginBottom = 30;
  const marginLeft = 40;

  d3.select(element).selectAll("*").remove();

  const x = d3.scaleBand()
      .domain(d3.groupSort(data, ([d]) => -d[y_], (d) => d[x_]))
      .range([marginLeft, width - marginRight])
      .padding(0.1);
  
  const y = d3.scaleLinear()
      .domain([0, d3.max(data, (d) => d[y_])])
      .range([height - marginBottom, marginTop]);


  const svg = d3.select(element)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", [0, 0, width, height])
      .attr("preserveAspectRatio", "xMidYMid meet");


  svg.append("g")
    .selectAll()
    .data(data)
    .join("rect")
      .attr("x", (d) => x(d[x_]))
      .attr("y", (d) => y(d[y_]))
      .attr("height", (d) => y(0) - y(d[y_]))
      .attr("width", x.bandwidth())
      .attr("fill", (d, i) => pallete[i % pallete.length]);

  svg.append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x).tickSizeOuter(0));


  svg.append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y).tickFormat((y) => (y * 100).toFixed()))
      .call(g => g.select(".domain").remove())
      .call(g => g.append("text")
          .attr("x", -marginLeft + 10)
          .attr("y", 10)
          .attr("fill", "currentColor")
          .attr("text-anchor", "start")
          .text("↑ Frequency (%)"));
}
}

export default { render };
        