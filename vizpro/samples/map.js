// usMap.js

let svg, g, states, path, zoom;

// Make init async to fetch data
async function init(el, state) {
  const { width, height } = state;

  // Fetch data dynamically
  const us = await d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json");

  zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on("zoom", zoomed);

  svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .attr("height", height)
    .style("max-width", "100%")
    .style("height", "auto")
    .on("click", reset);

  path = d3.geoPath();

  g = svg.append("g");

  states = g.append("g")
    .attr("fill", "#444")
    .attr("cursor", "pointer")
    .selectAll("path")
    .data(topojson.feature(us, us.objects.states).features)
    .join("path")
      .attr("d", path)
      .on("click", clicked);

  states.append("title")
    .text(d => d.properties.name);

  g.append("path")
    .attr("fill", "none")
    .attr("stroke", "white")
    .attr("stroke-linejoin", "round")
    .attr("d", path(
      topojson.mesh(us, us.objects.states, (a, b) => a !== b)
    ));

  svg.call(zoom);

  el.appendChild(svg.node());
}

function update(state) {
  const { width, height } = state;

  // Ajuste reactivo al resize
  svg
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .attr("height", height);
}

function destroy() {
  // Limpieza explícita (buena práctica)
  if (svg) {
    svg.on(".zoom", null);
    svg.remove();
  }
}

/* ---------- Interacciones ---------- */

function reset() {
  states.transition().style("fill", null);
  svg.transition().duration(750).call(
    zoom.transform,
    d3.zoomIdentity,
    d3.zoomTransform(svg.node()).invert([
      svg.attr("width") / 2,
      svg.attr("height") / 2
    ])
  );
}

function clicked(event, d) {
  event.stopPropagation();

  const [[x0, y0], [x1, y1]] = path.bounds(d);

  states.transition().style("fill", null);
  d3.select(this).transition().style("fill", "red");

  svg.transition().duration(750).call(
    zoom.transform,
    d3.zoomIdentity
      .translate(
        svg.attr("width") / 2,
        svg.attr("height") / 2
      )
      .scale(
        Math.min(
          8,
          0.9 / Math.max(
            (x1 - x0) / svg.attr("width"),
            (y1 - y0) / svg.attr("height")
          )
        )
      )
      .translate(
        -(x0 + x1) / 2,
        -(y0 + y1) / 2
      ),
    d3.pointer(event, svg.node())
  );
}

function zoomed(event) {
  const { transform } = event;
  g.attr("transform", transform);
  g.attr("stroke-width", 1 / transform.k);
}
