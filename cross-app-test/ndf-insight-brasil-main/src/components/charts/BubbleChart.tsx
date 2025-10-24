import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type crossfilter from "crossfilter2";

interface BubbleChartProps {
  cf: crossfilter.Crossfilter<any>;
}

export function BubbleChart({ cf }: BubbleChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const width = chartRef.current.offsetWidth;
    const height = 400;
    const margin = { top: 20, right: 40, bottom: 80, left: 60 };

    d3.select(chartRef.current).selectAll("*").remove();

    const svg = d3
      .select(chartRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const tenorBuckets = ["0-29D", "30-59D", "60-89D", "90-119D", "150-179D", "180-209D"];

    const dimension = cf.dimension((d: any) => [d.tenorBucket, d.isBuy ? "BUY" : "SELL"]);
    const group = dimension.group().reduce(
      (p: any, v: any) => {
        p.deals += v.status === "DEAL" ? 1 : 0;
        p.total += v.isActionable ? 1 : 0;
        p.notional += v.notional;
        return p;
      },
      (p: any, v: any) => {
        p.deals -= v.status === "DEAL" ? 1 : 0;
        p.total -= v.isActionable ? 1 : 0;
        p.notional -= v.notional;
        return p;
      },
      () => ({ deals: 0, total: 0, notional: 0 })
    );

    const data = group
      .all()
      .filter((d: any) => d.value.total > 0)
      .map((d: any) => ({
        tenor: d.key[0],
        side: d.key[1],
        conversion: d.value.deals / d.value.total,
        notional: d.value.notional,
      }));

    const xScale = d3
      .scaleBand()
      .domain(tenorBuckets)
      .range([0, width - margin.left - margin.right])
      .padding(0.5);

    const yScale = d3
      .scaleLinear()
      .domain([0, 1])
      .range([height - margin.top - margin.bottom, 0]);

    const radiusScale = d3
      .scaleSqrt()
      .domain([0, d3.max(data, (d) => d.notional) || 1])
      .range([3, 30]);

    const colorScale = d3.scaleOrdinal().domain(["BUY", "SELL"]).range(["#ffbf00", "#ff8c42"]);

    g.selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", (d) => {
        const x = xScale(d.tenor) || 0;
        const bandwidth = xScale.bandwidth();
        return x + bandwidth / 2 + (Math.random() - 0.5) * bandwidth * 0.4;
      })
      .attr("cy", (d) => yScale(d.conversion))
      .attr("r", (d) => radiusScale(d.notional))
      .attr("fill", (d) => colorScale(d.side) as string)
      .attr("opacity", 0.6)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1);

    g.append("g")
      .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .attr("fill", "#ffffff")
      .style("text-anchor", "end");

    g.append("g")
      .call(d3.axisLeft(yScale).tickFormat(d3.format(".0%")))
      .selectAll("text")
      .attr("fill", "#ffffff");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left + 15)
      .attr("x", 0 - (height - margin.top - margin.bottom) / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "#ffffff")
      .text("Taxa de Convergência");

    const legend = g.append("g").attr("transform", `translate(10,10)`);

    legend.append("circle").attr("cx", 5).attr("cy", 5).attr("r", 5).attr("fill", "#ffbf00");

    legend
      .append("text")
      .attr("x", 15)
      .attr("y", 9)
      .text("BUY")
      .attr("font-size", "12px")
      .attr("fill", "#ffffff");

    legend.append("circle").attr("cx", 70).attr("cy", 5).attr("r", 5).attr("fill", "#ff8c42");

    legend
      .append("text")
      .attr("x", 80)
      .attr("y", 9)
      .text("SELL")
      .attr("font-size", "12px")
      .attr("fill", "#ffffff");

    return () => {
      dimension.dispose();
    };
  }, [cf]);

  return (
    <div className="bg-card rounded-lg border p-4">
      <h3 className="text-lg font-bold mb-4">Bolhas – BUY e SELL (sobrepostos)</h3>
      <div ref={chartRef} className="w-full" />
    </div>
  );
}
