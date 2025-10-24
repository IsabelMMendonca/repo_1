import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type crossfilter from "crossfilter2";
import { formatBrazilianNumber } from "../../utils/formatters";

interface SideVolumeChartProps {
  cf: crossfilter.Crossfilter<any>;
}

export function SideVolumeChart({ cf }: SideVolumeChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const width = chartRef.current.offsetWidth;
    const height = 400;
    const margin = { top: 20, right: 40, bottom: 60, left: 120 };

    d3.select(chartRef.current).selectAll("*").remove();

    const svg = d3
      .select(chartRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const tenorBuckets = ["0-29D", "30-59D", "60-89D", "90-119D", "150-179D", "180-209D"];

    const dimension = cf.dimension((d: any) => d.tenorBucket);
    const group = dimension.group().reduce(
      (p: any, v: any) => {
        if (v.isBuy) {
          p.buy += v.notional;
        } else {
          p.sell += v.notional;
        }
        return p;
      },
      (p: any, v: any) => {
        if (v.isBuy) {
          p.buy -= v.notional;
        } else {
          p.sell -= v.notional;
        }
        return p;
      },
      () => ({ buy: 0, sell: 0 })
    );

    const data = tenorBuckets.map((bucket) => {
      const match = group.all().find((d: any) => d.key === bucket);
      const value = match?.value as { buy: number; sell: number } | undefined;
      return {
        tenor: bucket,
        buy: value?.buy || 0,
        sell: -(value?.sell || 0),
      };
    });

    const maxVal = d3.max(data, (d) => Math.max(Math.abs(d.buy), Math.abs(d.sell))) || 1;

    const xScale = d3
      .scaleLinear()
      .domain([-maxVal, maxVal])
      .range([0, width - margin.left - margin.right]);

    const yScale = d3
      .scaleBand()
      .domain(tenorBuckets)
      .range([0, height - margin.top - margin.bottom])
      .padding(0.2);

    g.append("line")
      .attr("x1", xScale(0))
      .attr("x2", xScale(0))
      .attr("y1", 0)
      .attr("y2", height - margin.top - margin.bottom)
      .attr("stroke", "#666666")
      .attr("stroke-width", 2);

    g.selectAll(".bar-sell")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar-sell")
      .attr("x", (d) => xScale(d.sell))
      .attr("y", (d) => yScale(d.tenor) || 0)
      .attr("width", (d) => xScale(0) - xScale(d.sell))
      .attr("height", yScale.bandwidth())
      .attr("fill", "#ffbf00");

    g.selectAll(".bar-buy")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar-buy")
      .attr("x", xScale(0))
      .attr("y", (d) => yScale(d.tenor) || 0)
      .attr("width", (d) => xScale(d.buy) - xScale(0))
      .attr("height", yScale.bandwidth())
      .attr("fill", "#ffbf00");

    g.append("g")
      .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickFormat((d) => formatBrazilianNumber(Math.abs(d as number) / 1000000, 1) + "M")
      )
      .selectAll("text")
      .attr("fill", "#ffffff");

    g.append("g")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .attr("fill", "#ffffff");

    const legend = g.append("g").attr("transform", `translate(10,10)`);

    legend
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", "#ffbf00");

    legend
      .append("text")
      .attr("x", 20)
      .attr("y", 12)
      .text("SELL")
      .attr("font-size", "12px")
      .attr("fill", "#ffffff");

    legend
      .append("rect")
      .attr("x", 70)
      .attr("y", 0)
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", "#ffbf00");

    legend
      .append("text")
      .attr("x", 90)
      .attr("y", 12)
      .text("BUY")
      .attr("font-size", "12px")
      .attr("fill", "#ffffff");

    return () => {
      dimension.dispose();
    };
  }, [cf]);

  return (
    <div className="bg-card rounded-lg border p-4">
      <h3 className="text-lg font-bold mb-4">
        Visualização Side X Volume X Prazo (Barras Horizontais)
      </h3>
      <div ref={chartRef} className="w-full" />
    </div>
  );
}
