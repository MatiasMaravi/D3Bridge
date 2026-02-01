function plot(data,x_,y_,pallete) {

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