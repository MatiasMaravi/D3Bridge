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