import { useMemo } from "react";
import { useNDFData } from "../contexts/NDFDataContext";
import { KPICard } from "../components/KPICard";
import { formatBRL, formatBps, formatPercentage, formatBrazilianNumber } from "../utils/formatters";
import { TrendingUp, DollarSign, Percent, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Overview() {
  const { data } = useNDFData();

  const kpis = useMemo(() => {
    if (data.length === 0) {
      return {
        volumeTotal: 0,
        resultadoTotal: 0,
        markupMedio: 0,
        prazoMedioPonderado: 0,
        taxaConversao: 0,
      };
    }

    const deals = data.filter(r => r.status === 'DEAL');
    const actionable = data.filter(r => r.isActionable);

    const volumeTotal = deals.reduce((sum, r) => sum + r.notional, 0);
    const resultadoTotal = deals.reduce((sum, r) => sum + (r.plBrl || 0), 0);

    // Weighted average markup
    const totalNotional = deals.reduce((sum, r) => sum + r.notional, 0);
    const weightedMarkup = deals.reduce((sum, r) => {
      if (r.markupBps === null) return sum;
      return sum + (r.markupBps * r.notional);
    }, 0);
    const markupMedio = totalNotional > 0 ? weightedMarkup / totalNotional : 0;

    // Weighted average tenor
    const weightedTenor = deals.reduce((sum, r) => {
      if (r.tenorDc === null) return sum;
      return sum + (r.tenorDc * r.notional);
    }, 0);
    const prazoMedioPonderado = totalNotional > 0 ? weightedTenor / totalNotional : 0;

    // Conversion rate
    const dealCount = deals.length;
    const actionableCount = actionable.length;
    const taxaConversao = actionableCount > 0 ? dealCount / actionableCount : 0;

    return {
      volumeTotal,
      resultadoTotal,
      markupMedio,
      prazoMedioPonderado,
      taxaConversao,
    };
  }, [data]);

  // Result by currency
  const resultByCurrency = useMemo(() => {
    if (data.length === 0) return [];

    const deals = data.filter(r => r.status === 'DEAL');
    const byCurrency: { [key: string]: number } = {};

    deals.forEach(r => {
      if (!byCurrency[r.currency]) {
        byCurrency[r.currency] = 0;
      }
      byCurrency[r.currency] += r.plBrl || 0;
    });

    const chartData = Object.entries(byCurrency).map(([currency, value]) => ({
      currency,
      value: value / 1000, // in thousands
    }));

    // Add subtotal
    const subtotal = chartData.reduce((sum, item) => sum + item.value, 0);
    chartData.push({ currency: 'Subtotal', value: subtotal });

    return chartData;
  }, [data]);

  // Status distribution
  const statusDistribution = useMemo(() => {
    if (data.length === 0) return [];

    const statusCount = data.reduce((acc, r) => {
      const status = r.status === 'NOTH.DONE' ? 'NOT DONE' : r.status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    return [
      { status: 'DEAL', count: statusCount['DEAL'] || 0 },
      { status: 'NOT DONE', count: statusCount['NOT DONE'] || 0 },
      { status: 'REJECTED', count: statusCount['REJECTED'] || 0 },
    ];
  }, [data]);

  // Rejection reasons with rate compared to total operations
  const rejectionReasons = useMemo(() => {
    if (data.length === 0) return [];

    const rejected = data.filter(r => r.status === 'REJECTED');
    const reasonCount = rejected.reduce((acc, r) => {
      const reason = r.rejectedMessage || 'Unknown';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const totalOperations = data.length;
    const totalRejections = rejected.length;
    
    return Object.entries(reasonCount)
      .map(([name, value]) => ({
        name,
        value,
        percentageOfRejections: totalRejections > 0 ? (value / totalRejections) * 100 : 0,
        percentageOfTotal: totalOperations > 0 ? (value / totalOperations) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  // Client notional distribution
  const clientNotionalDistribution = useMemo(() => {
    if (data.length === 0) return [];

    const clientNotionals: { [key: string]: number } = {};
    
    data.forEach(r => {
      if (r.counterparty) {
        clientNotionals[r.counterparty] = (clientNotionals[r.counterparty] || 0) + r.notional;
      }
    });

    const ranges = [
      { label: '0-1k', min: 0, max: 1000, count: 0 },
      { label: '1k-5k', min: 1000, max: 5000, count: 0 },
      { label: '10k-50k', min: 10000, max: 50000, count: 0 },
      { label: '50k-100k', min: 50000, max: 100000, count: 0 },
    ];

    Object.values(clientNotionals).forEach(notional => {
      for (const range of ranges) {
        if (notional >= range.min && notional < range.max) {
          range.count++;
          break;
        }
      }
    });

    return ranges;
  }, [data]);

  const PIE_COLORS = ['#ffbf00', '#ff8c42', '#5bc0de', '#f39c12', '#e74c3c'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard NDF e-Sales</h1>
        <p className="text-muted-foreground mt-1">
          Visão geral de operações de câmbio NDF
        </p>
      </div>

      {data.length > 0 && (
        <>
          {/* KPI Cards and Result by Currency - Top Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* KPI Cards Section - 2 columns */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>KPIs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <KPICard
                      title="Volume Total Negociado"
                      value={formatBrazilianNumber(kpis.volumeTotal, 0)}
                      icon={DollarSign}
                      variant="info"
                    />
                    <KPICard
                      title="Resultado Total (Lucro)"
                      value={formatBRL(kpis.resultadoTotal)}
                      icon={TrendingUp}
                      variant="success"
                    />
                    <KPICard
                      title="Markup Médio (bps)"
                      value={formatBps(kpis.markupMedio)}
                      icon={Percent}
                      variant="warning"
                    />
                    <KPICard
                      title="Taxa de Conversão"
                      value={formatPercentage(kpis.taxaConversao)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Result by Currency Chart - 1 column */}
            <div className="lg:col-span-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Resultado Por Moeda</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={resultByCurrency}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="currency" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                        }}
                        formatter={(value: number) => [`${formatBrazilianNumber(value)} mil`, 'Resultado']}
                      />
                      <Bar 
                        dataKey="value" 
                        fill="#5bc0de"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Status and Clientes - Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Section */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Status Distribution Bar Chart */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Distribuição de transações</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={statusDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="status" 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                          }}
                          formatter={(value: number) => [value, 'Count']}
                        />
                        <Bar 
                          dataKey="count" 
                          fill="#ffbf00"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      Count of KR_status
                    </p>
                  </div>

                  {/* Rejection Reasons with Rates */}
                  {rejectionReasons.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3">Motivos de rejeições</h4>
                      
                      {/* Table with rejection rates */}
                      <div className="mb-4 space-y-2">
                        <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-muted-foreground pb-2 border-b border-border">
                          <div className="col-span-2">Motivo</div>
                          <div className="text-right">Qtd</div>
                          <div className="text-right">% Total</div>
                        </div>
                        {rejectionReasons.map((reason, index) => (
                          <div 
                            key={index} 
                            className="grid grid-cols-4 gap-2 text-xs items-center py-1.5 hover:bg-muted/30 rounded px-1"
                          >
                            <div className="col-span-2 flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full flex-shrink-0" 
                                style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                              />
                              <span className="truncate" title={reason.name}>{reason.name}</span>
                            </div>
                            <div className="text-right font-medium">{reason.value}</div>
                            <div className="text-right text-warning font-semibold">
                              {reason.percentageOfTotal.toFixed(1)}%
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pie Chart */}
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={rejectionReasons}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ percentageOfRejections }) => `${percentageOfRejections.toFixed(1)}%`}
                            outerRadius={70}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {rejectionReasons.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '6px',
                            }}
                            formatter={(value: number, name: string, props: any) => [
                              <>
                                <div>Quantidade: {value}</div>
                                <div>% das rejeições: {props.payload.percentageOfRejections.toFixed(1)}%</div>
                                <div className="font-bold text-warning">% do total: {props.payload.percentageOfTotal.toFixed(1)}%</div>
                              </>,
                              props.payload.name
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Taxa de rejeição em relação ao volume total de operações
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Clientes Section */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Clientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <h4 className="text-sm font-semibold mb-3">Total de clientes por faixa de notional</h4>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart 
                      data={clientNotionalDistribution} 
                      layout="vertical"
                      margin={{ left: 20, right: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        type="number"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                      />
                      <YAxis 
                        type="category"
                        dataKey="label" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                        }}
                        formatter={(value: number) => [value, 'Quantidade de clientes']}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="#ff8c42"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
