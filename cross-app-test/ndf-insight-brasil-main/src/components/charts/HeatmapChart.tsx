import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type crossfilter from "crossfilter2";

interface HeatmapChartProps {
  cf: crossfilter.Crossfilter<any>;
}

export function HeatmapChart({ cf }: HeatmapChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const width = chartRef.current.offsetWidth;
    const height = 400;
    const margin = { top: 20, right: 120, bottom: 80, left: 100 };

    d3.select(chartRef.current).selectAll("*").remove();

    const svg = d3
      .select(chartRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const tenorBuckets = ["0-29D", "30-59D", "60-89D", "90-119D", "150-179D", "180-209D"];
    const notionalBuckets = ["0-100k", "100k-500k", "500k-1M", ">1M"];

    const dimension = cf.dimension((d: any) => [d.tenorBucket, d.notionalBucket]);
    const group = dimension.group().reduce(
      (p: any, v: any) => {
        p.buy += v.isBuy ? 1 : 0;
        p.sell += v.isBuy ? 0 : 1;
        return p;
      },
      (p: any, v: any) => {
        p.buy -= v.isBuy ? 1 : 0;
        p.sell -= v.isBuy ? 0 : 1;
        return p;
      },
      () => ({ buy: 0, sell: 0 })
    );

    const data = group.all().map((d: any) => {
      const total = d.value.buy + d.value.sell;
      const buyPct = total > 0 ? d.value.buy / total : 0.5;
      return {
        tenor: d.key[0],
        notional: d.key[1],
        buyPct,
        label: `${(buyPct * 100).toFixed(1)}%`,
      };
    });

    const cellWidth = (width - margin.left - margin.right) / tenorBuckets.length;
    const cellHeight = (height - margin.top - margin.bottom) / notionalBuckets.length;

    const colorScale = d3
      .scaleLinear<string>()
      .domain([0, 0.45, 0.55, 1])
      .range(["#ef4444", "#333333", "#333333", "#ffbf00"]);

    const xScale = d3.scaleBand().domain(tenorBuckets).range([0, cellWidth * tenorBuckets.length]);
    const yScale = d3.scaleBand().domain(notionalBuckets).range([0, cellHeight * notionalBuckets.length]);

    g.selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", (d) => xScale(d.tenor) || 0)
      .attr("y", (d) => yScale(d.notional) || 0)
      .attr("width", cellWidth)
      .attr("height", cellHeight)
      .attr("fill", (d) => colorScale(d.buyPct))
      .attr("stroke", "#333333")
      .attr("stroke-width", 1);

    g.selectAll("text")
      .data(data)
      .enter()
      .append("text")
      .attr("x", (d) => (xScale(d.tenor) || 0) + cellWidth / 2)
      .attr("y", (d) => (yScale(d.notional) || 0) + cellHeight / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "#ffffff")
      .attr("font-size", "12px")
      .attr("font-weight", "600")
      .text((d) => d.label);

    g.append("g")
      .attr("transform", `translate(0,${cellHeight * notionalBuckets.length})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .attr("fill", "#ffffff")
      .style("text-anchor", "end");

    g.append("g")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .attr("fill", "#ffffff");

    return () => {
      dimension.dispose();
    };
  }, [cf]);

  return (
    <div className="bg-card rounded-lg border p-4">
      <h3 className="text-lg font-bold mb-4">
        Heatmap de Desempenho (cores suavizadas): Predominância BUY, SELL, Equilíbrio
      </h3>
      <div ref={chartRef} className="w-full" />
    </div>
  );
}
