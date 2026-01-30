/**
 * Horizontal Bar chart adaptado para usar con CustomWidget
 * Usa las variables del contexto: element, width, height, data
 * 
 * @param {Array} data - Array de objetos con propiedades 'letter' y 'frequency'
 */
function plot(data) {
  // Márgenes
  const marginTop = 30;
  const marginRight = 20;
  const marginBottom = 10;
  const marginLeft = 40;

  // Limpiar el contenedor
  d3.select(element).selectAll("*").remove();

  // Create the scales.
  const x = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.frequency)])
      .range([marginLeft, width - marginRight]);
  
  const y = d3.scaleBand()
      .domain(d3.sort(data, d => -d.frequency).map(d => d.letter))
      .rangeRound([marginTop, height - marginBottom])
      .padding(0.1);

  // Create a value format.
  const format = x.tickFormat(20, "%");

  // Create the SVG container.
  const svg = d3.select(element)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");
  
  // Append a rect for each letter.
  svg.append("g")
      .attr("fill", "steelblue")
    .selectAll()
    .data(data)
    .join("rect")
      .attr("x", x(0))
      .attr("y", (d) => y(d.letter))
      .attr("width", (d) => x(d.frequency) - x(0))
      .attr("height", y.bandwidth());
  
  // Append a label for each letter.
  svg.append("g")
      .attr("fill", "white")
      .attr("text-anchor", "end")
    .selectAll()
    .data(data)
    .join("text")
      .attr("x", (d) => x(d.frequency))
      .attr("y", (d) => y(d.letter) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("dx", -4)
      .text((d) => format(d.frequency))
    .call((text) => text.filter(d => x(d.frequency) - x(0) < 20) // short bars
      .attr("dx", +4)
      .attr("fill", "black")
      .attr("text-anchor", "start"));

  // Create the axes.
  svg.append("g")
      .attr("transform", `translate(0,${marginTop})`)
      .call(d3.axisTop(x).ticks(width / 80, "%"))
      .call(g => g.select(".domain").remove());

  svg.append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y).tickSizeOuter(0));
}
