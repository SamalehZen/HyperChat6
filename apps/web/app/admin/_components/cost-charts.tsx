"use client";
import { useEffect, useMemo, useState } from 'react';
import { ResponsiveLine } from '@nivo/line';
import { BentoCard } from './bento-card';

export function CostCharts({ windowSel }: { windowSel: '24h'|'7j'|'30j' }) {
  const [metrics, setMetrics] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const res = await fetch(`/api/admin/metrics?window=${windowSel}`, { cache: 'no-store' });
      if (!mounted) return;
      if (res.ok) setMetrics(await res.json());
    };
    load();
    return () => { mounted = false; };
  }, [windowSel]);

  const lineData = useMemo(() => {
    const series = metrics?.costByMode?.series;
    if (!series) return [];
    const { dates, modes } = series as { dates: string[]; modes: Record<string, number[]> };
    
    return Object.entries(modes || {}).map(([mode, values]) => ({
      id: mode,
      data: dates.map((date, i) => ({
        x: new Date(date).toLocaleDateString('fr-FR', { 
          month: 'short', 
          day: 'numeric',
          hour: windowSel === '24h' ? 'numeric' : undefined 
        }),
        y: values[i] || 0,
      })),
    }));
  }, [metrics, windowSel]);

  const theme = {
    background: 'transparent',
    text: {
      fontSize: 11,
      fill: 'hsl(var(--muted-foreground))',
      fontFamily: 'var(--font-inter)',
    },
    axis: {
      domain: {
        line: {
          stroke: 'hsl(var(--border))',
          strokeWidth: 1,
        },
      },
      ticks: {
        line: {
          stroke: 'hsl(var(--border))',
          strokeWidth: 1,
        },
      },
    },
    grid: {
      line: {
        stroke: 'hsl(var(--border) / 0.3)',
        strokeWidth: 1,
      },
    },
    tooltip: {
      container: {
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        color: 'hsl(var(--foreground))',
        fontSize: 12,
        borderRadius: '8px',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
        padding: '12px',
      },
    },
  };

  const colors = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#6366f1', '#84cc16', '#06b6d4', '#ec4899', '#8b5cf6'];

  return (
    <BentoCard variant="panel" size="md" delay={0.6} lift className="p-6 min-h-[380px]">
      <h2 className="mb-4 text-xl font-bold text-foreground">Coût par mode ($)</h2>
      <div className="w-full h-[300px]">
        <ResponsiveLine
          data={lineData}
          theme={theme}
          colors={colors}
          margin={{ top: 20, right: 120, bottom: 50, left: 60 }}
          xScale={{ type: 'point' }}
          yScale={{ type: 'linear', min: 0, max: 'auto' }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -45,
            legend: 'Date',
            legendOffset: 42,
            legendPosition: 'middle',
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Coût (USD)',
            legendOffset: -50,
            legendPosition: 'middle',
            format: (value) => `$${value.toFixed(2)}`,
          }}
          pointSize={8}
          pointColor={{ from: 'color' }}
          pointBorderWidth={2}
          pointBorderColor={{ from: 'serieColor' }}
          enableArea={true}
          areaOpacity={0.15}
          areaBaselineValue={0}
          useMesh={true}
          enableSlices="x"
          curve="monotoneX"
          legends={[
            {
              anchor: 'bottom-right',
              direction: 'column',
              justify: false,
              translateX: 100,
              translateY: 0,
              itemsSpacing: 2,
              itemDirection: 'left-to-right',
              itemWidth: 80,
              itemHeight: 20,
              itemOpacity: 0.75,
              symbolSize: 12,
              symbolShape: 'circle',
            },
          ]}
        />
      </div>
    </BentoCard>
  );
}