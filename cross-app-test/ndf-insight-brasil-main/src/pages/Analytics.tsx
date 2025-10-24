import { useState } from "react";
import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { useNDFData } from "../contexts/NDFDataContext";
import { Button } from "../components/ui/button";
import crossfilter from "crossfilter2";
import { HeatmapChart } from "../components/charts/HeatmapChart";
import { SideVolumeChart } from "../components/charts/SideVolumeChart";
import { BubbleChart } from "../components/charts/BubbleChart";
import type { NDFRecord } from "../types/ndf";

export default function Analytics() {
  const { data } = useNDFData();

  const cf = data.length > 0 ? crossfilter(data) : null;

  const { tenorDimension, buyGroup, sellGroup } = (() => {
    if (!cf) return { tenorDimension: null, buyGroup: null, sellGroup: null };

    const tenorDim = cf.dimension((d: NDFRecord) => d.tenorBucket);

    const buyGrp = tenorDim.group().reduce(
      (p: any, v: NDFRecord) => {
        if (v.isBuy && v.isActionable) {
          p.deals += v.status === "DEAL" ? 1 : 0;
          p.total += 1;
        }
        return p;
      },
      (p: any, v: NDFRecord) => {
        if (v.isBuy && v.isActionable) {
          p.deals -= v.status === "DEAL" ? 1 : 0;
          p.total -= 1;
        }
        return p;
      },
      () => ({ deals: 0, total: 0 })
    );

    const sellGrp = tenorDim.group().reduce(
      (p: any, v: NDFRecord) => {
        if (!v.isBuy && v.isActionable) {
          p.deals += v.status === "DEAL" ? 1 : 0;
          p.total += 1;
        }
        return p;
      },
      (p: any, v: NDFRecord) => {
        if (!v.isBuy && v.isActionable) {
          p.deals -= v.status === "DEAL" ? 1 : 0;
          p.total -= 1;
        }
        return p;
      },
      () => ({ deals: 0, total: 0 })
    );

    const buyGroupFinal: any = {
      all: () =>
        buyGrp.all().map((d: any) => ({
          key: d.key,
          value: d.value.total > 0 ? d.value.deals / d.value.total : 0,
        })),
    };

    const sellGroupFinal: any = {
      all: () =>
        sellGrp.all().map((d: any) => ({
          key: d.key,
          value: d.value.total > 0 ? d.value.deals / d.value.total : 0,
        })),
    };

    return {
      tenorDimension: tenorDim,
      buyGroup: buyGroupFinal,
      sellGroup: sellGroupFinal,
    };
  })();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-card border-b z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Analytics – NDF e-Sales</h1>
        </div>
        <Link to="/">
          <Button variant="outline" size="sm">
            <Home className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
        </Link>
      </div>

      <div className="pt-20 p-6">
        <div className="mb-6">
          <p className="text-muted-foreground">
            Visualizações interativas de taxa de conversão, volume e predominância por prazo e side
          </p>
        </div>

        {data.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <p className="text-xl text-muted-foreground">
                Nenhum dado carregado
              </p>
              <p className="text-sm text-muted-foreground">
                Por favor, carregue um arquivo CSV na página Dashboard primeiro
              </p>
              <Link to="/">
                <Button>
                  <Home className="w-4 h-4 mr-2" />
                  Ir para Dashboard
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {cf && <HeatmapChart cf={cf} />}
            {cf && <SideVolumeChart cf={cf} />}
            {cf && <BubbleChart cf={cf} />}
          </div>
        )}
      </div>
    </div>
  );
}
