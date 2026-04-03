function plot(data) {
  // ============================================================
  // CONFIGURACIÓN Y CONSTANTES
  // ============================================================
  const CONFIG = {
    margin: 40,
    pointRadius: 4.2,
    strokeWidth: 1.6,
    transitionDuration: 600,
    zoomExtent: [0.5, 20],
    colors: {
      0: "#4C97FF", 1: "#FF8C2E", 2: "#5FBF4D", 3: "#FF4C4C", 4: "#B383F0",
      5: "#B36C5C", 6: "#FF9DE6", 7: "#BFBFBF", 8: "#FFF175", 9: "#66E3FF"
    }
  };

  const { epochs } = data;
  const maxEpoch = epochs.length - 1;

  // ============================================================
  // UTILIDADES
  // ============================================================
  
  // Asignar índice estable a cada punto
  epochs.forEach(epochData => {
    epochData.points.forEach((point, i) => {
      point.idx = point.idx ?? i;
    });
  });

  // Convertidor hex → rgba
  const rgba = (hex, alpha) => {
    const bigint = parseInt(hex.slice(1), 16);
    return `rgba(${(bigint >> 16) & 255},${(bigint >> 8) & 255},${bigint & 255},${alpha})`;
  };

  // Generador de líneas D3
  const lineGenerator = d3.line()
    .x(d => d[0])
    .y(d => d[1])
    .curve(d3.curveLinear);

  // Calcular trayectoria hasta un epoch dado
  const getTrajectory = (idx, epochIndex) => 
    epochs.slice(0, epochIndex + 1).map(e => [
      xScale(e.points[idx].x),
      yScale(e.points[idx].y)
    ]);

  // Calcular trayectoria del epoch anterior al actual (para animación)
  const getPreviousTrajectory = (idx, epochIndex) => {
    if (epochIndex === 0) return getTrajectory(idx, 0);
    return getTrajectory(idx, epochIndex - 1);
  };

  // ============================================================
  // ESTADO
  // ============================================================
  let selectedLabels = new Set();
  const legendItems = {};

  // ============================================================
  // ESTRUCTURA DOM
  // ============================================================
  d3.select(element).selectAll("*").remove();

  const container = d3.select(element)
    .append("div")
    .attr("class", "epoch-viz-container")
    .style("font-family", "sans-serif")
    .style("position", "relative");

  // --- Controles ---
  const controls = container.append("div")
    .attr("class", "controls")
    .style("margin-bottom", "8px");

  // Slider de Epoch
  controls.append("label").append("b").text("Epoch: ");
  const epochSlider = controls.append("input")
    .attr("type", "range")
    .attr("min", 0)
    .attr("max", maxEpoch)
    .attr("value", 0)
    .attr("step", 1);

  const epochLabel = controls.append("span").text("0");
  controls.append("span").html("&nbsp;&nbsp;&nbsp;");

  // Selector de Modo
  controls.append("label").append("b").text("Mode: ");
  const modeSelect = controls.append("select")
    .selectAll("option")
    .data([
      { value: "positions", text: "Positions" },
      { value: "trajectories", text: "Trajectories" }
    ])
    .join("option")
    .attr("value", d => d.value)
    .text(d => d.text);

  const modeSelectEl = controls.select("select");
  controls.append("span").html("&nbsp;&nbsp;&nbsp;");

  // Toggle de Ejes
  controls.append("label").append("b").text("Show Axes: ");
  const axisSelect = controls.append("select");
  axisSelect.selectAll("option")
    .data([
      { value: "off", text: "Off" },
      { value: "on", text: "On" }
    ])
    .join("option")
    .attr("value", d => d.value)
    .text(d => d.text);

  // ============================================================
  // SVG Y ESCALAS
  // ============================================================
  const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height);

  const defs = svg.append("defs");
  const g = svg.append("g");

  // Capas ordenadas (z-index implícito por orden de creación)
  const axisLayer = g.append("g").attr("class", "axis-layer");
  const trajectoryGroup = g.append("g").attr("class", "trajectory-layer");
  const dotGroup = g.append("g").attr("class", "dot-layer");

  // Zoom
  const zoom = d3.zoom()
    .scaleExtent(CONFIG.zoomExtent)
    .on("zoom", ({ transform }) => g.attr("transform", transform));
  svg.call(zoom);

  // Escalas globales (calculadas una vez sobre todos los puntos)
  const allPoints = epochs.flatMap(e => e.points);
  const xScale = d3.scaleLinear()
    .domain(d3.extent(allPoints, d => d.x))
    .range([CONFIG.margin, width - CONFIG.margin]);
  const yScale = d3.scaleLinear()
    .domain(d3.extent(allPoints, d => d.y))
    .range([height - CONFIG.margin, CONFIG.margin]);

  // Ejes
  const xAxisG = axisLayer.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height - CONFIG.margin})`)
    .style("display", "none")
    .call(d3.axisBottom(xScale));

  const yAxisG = axisLayer.append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${CONFIG.margin},0)`)
    .style("display", "none")
    .call(d3.axisLeft(yScale));

  // ============================================================
  // LEYENDA INTERACTIVA
  // ============================================================
  const legend = container.append("div")
    .attr("class", "legend")
    .style("margin-top", "10px")
    .style("display", "flex")
    .style("gap", "12px")
    .style("flex-wrap", "wrap");

  const updateLegendStyles = () => {
    const hasSelection = selectedLabels.size > 0;
    Object.entries(legendItems).forEach(([labelStr, sel]) => {
      const isActive = !hasSelection || selectedLabels.has(+labelStr);
      sel.style("opacity", isActive ? 1 : 0.2);
    });
  };

  // Crear items de leyenda usando join pattern
  Object.entries(CONFIG.colors).forEach(([label, color]) => {
    const labelNum = +label;
    const entry = legend.append("div")
      .style("display", "flex")
      .style("align-items", "center")
      .style("gap", "4px")
      .style("cursor", "pointer")
      .on("click", function(event) {
        if (event.detail === 2) {
          selectedLabels.clear();
        } else {
          selectedLabels.has(labelNum) 
            ? selectedLabels.delete(labelNum)
            : selectedLabels.add(labelNum);
        }
        updateLegendStyles();
        refresh();
      });

    entry.append("div")
      .style("width", "18px")
      .style("height", "18px")
      .style("background", color)
      .style("border", "2px solid black");

    entry.append("span").text(label);
    legendItems[labelNum] = entry;
  });

  
  // ============================================================
  // TOOLTIP
  // ============================================================
  const tooltip = container.append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("padding", "4px 8px")
    .style("font-size", "12px")
    .style("background", "white")
    .style("border", "1px solid #ccc")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("opacity", 0);

  const showTooltip = (event, d) => {
    const [mx, my] = d3.pointer(event, container.node());
    tooltip
      .style("opacity", 1)
      .html(`ID: <b>${d.id}</b> | Label: <b>${d.label}</b>`)
      .style("left", `${mx + 10}px`)
      .style("top", `${my - 10}px`);
  };

  const hideTooltip = () => tooltip.style("opacity", 0);

  // ============================================================
  // FUNCIONES DE ACTUALIZACIÓN PRINCIPALES
  // ============================================================

  /**
   * Actualiza o crea gradientes para cada trayectoria
   */
  const updateGradients = (points, epochIndex) => {
    const gradients = defs.selectAll("linearGradient")
      .data(points, d => d.idx);

    gradients.join(
      enter => enter.append("linearGradient")
        .attr("id", d => `grad-${d.idx}`)
        .attr("gradientUnits", "userSpaceOnUse"),
      update => update,
      exit => exit.remove()
    ).each(function(d) {
      const grad = d3.select(this);
      const traj = getTrajectory(d.idx, epochIndex);
      const [x1, y1] = traj[0];
      const [x2, y2] = traj[traj.length - 1];

      grad.attr("x1", x1).attr("y1", y1).attr("x2", x2).attr("y2", y2);

      // Actualizar stops usando join
      const stops = grad.selectAll("stop")
        .data([
          { offset: "0%", color: rgba(CONFIG.colors[d.label], 0.10) },
          { offset: "100%", color: rgba(CONFIG.colors[d.label], 1.0) }
        ]);

      stops.join("stop")
        .attr("offset", s => s.offset)
        .attr("stop-color", s => s.color);
    });
  };

  /**
   * Actualiza las trayectorias con animación sincronizada
   */
  const updateTrajectories = (points, epochIndex) => {
    updateGradients(points, epochIndex);

    trajectoryGroup.selectAll("path")
      .data(points, d => d.idx)
      .join(
        enter => enter.append("path")
          .attr("fill", "none")
          .attr("stroke-width", CONFIG.strokeWidth)
          .attr("stroke", d => `url(#grad-${d.idx})`)
          .attr("d", d => lineGenerator(getTrajectory(d.idx, epochIndex)))
          .attr("stroke-dasharray", function() {
            const length = this.getTotalLength();
            return `${length} ${length}`;
          })
          .attr("stroke-dashoffset", function() {
            return this.getTotalLength();
          })
          .call(enter => enter.transition()
            .duration(CONFIG.transitionDuration)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0)),

        update => update
          .attr("stroke", d => `url(#grad-${d.idx})`)
          .each(function(d) {
            const path = d3.select(this);
            const prevPath = lineGenerator(getPreviousTrajectory(d.idx, epochIndex));
            const newPath = lineGenerator(getTrajectory(d.idx, epochIndex));
            
            // Primero establecer el path anterior
            path.attr("d", prevPath)
              .attr("stroke-dasharray", null)
              .attr("stroke-dashoffset", null);

            // Si la trayectoria creció, animar el nuevo segmento
            if (epochIndex > 0) {
              const prevLength = path.node().getTotalLength();
              
              // Actualizar al nuevo path
              path.attr("d", newPath);
              const newLength = path.node().getTotalLength();
              const segmentLength = newLength - prevLength;

              if (segmentLength > 0) {
                // Animar solo el nuevo segmento
                path.attr("stroke-dasharray", `${newLength}`)
                  .attr("stroke-dashoffset", segmentLength)
                  .transition()
                  .duration(CONFIG.transitionDuration)
                  .ease(d3.easeLinear)
                  .attr("stroke-dashoffset", 0);
              }
            }
          }),

        exit => exit.transition()
          .duration(CONFIG.transitionDuration / 2)
          .style("opacity", 0)
          .remove()
      );
  };

  /**
   * Actualiza los puntos con animación
   */
  const updateDots = (points) => {
    dotGroup.selectAll("circle")
      .data(points, d => d.idx)
      .join(
        enter => enter.append("circle")
          .attr("r", CONFIG.pointRadius)
          .attr("fill", d => CONFIG.colors[d.label])
          .attr("cx", d => xScale(d.x))
          .attr("cy", d => yScale(d.y))
          .style("opacity", 0)
          .on("mousemove", showTooltip)
          .on("mouseleave", hideTooltip)
          .call(enter => enter.transition()
            .duration(CONFIG.transitionDuration)
            .style("opacity", 1)),

        update => update
          .call(update => update.transition()
            .duration(CONFIG.transitionDuration)
            .ease(d3.easeLinear)
            .attr("cx", d => xScale(d.x))
            .attr("cy", d => yScale(d.y))),

        exit => exit
          .call(exit => exit.transition()
            .duration(CONFIG.transitionDuration / 2)
            .style("opacity", 0)
            .remove())
      );
  };

  /**
   * Función principal de actualización
   */
  const update = (epochIndex, mode, showAxes) => {
    // Filtrar puntos según selección
    const allPointsInEpoch = epochs[epochIndex].points;
    const points = selectedLabels.size > 0
      ? allPointsInEpoch.filter(d => selectedLabels.has(d.label))
      : allPointsInEpoch;

    // Actualizar UI
    epochLabel.text(epochIndex);
    xAxisG.style("display", showAxes === "on" ? null : "none");
    yAxisG.style("display", showAxes === "on" ? null : "none");

    // Actualizar visualización según modo
    if (mode === "trajectories") {
      updateTrajectories(points, epochIndex);
    } else {
      // Limpiar trayectorias con transición
      trajectoryGroup.selectAll("path")
        .transition()
        .duration(CONFIG.transitionDuration / 2)
        .style("opacity", 0)
        .remove();
      defs.selectAll("linearGradient").remove();
    }

    // Siempre actualizar puntos
    updateDots(points);
  };

  /**
   * Obtener estado actual de controles y refrescar
   */
  const refresh = () => {
    update(
      +epochSlider.property("value"),
      modeSelectEl.property("value"),
      axisSelect.property("value")
    );
  };

  // ============================================================
  // EVENT LISTENERS (usando D3 consistentemente)
  // ============================================================
  epochSlider.on("input", refresh);
  modeSelectEl.on("change", refresh);
  axisSelect.on("change", refresh);

  // ============================================================
  // INICIALIZACIÓN
  // ============================================================
  updateLegendStyles();
  update(0, "positions", "off");
}