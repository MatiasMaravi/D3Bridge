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
          .attr("x", -marginLeft)
          .attr("y", 10)
          .attr("fill", "currentColor")
          .attr("text-anchor", "start")
          .text("↑ Frequency (%)"));
}