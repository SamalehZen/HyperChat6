"use client";
import { useEffect, useMemo, useState } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { BentoCard } from './bento-card';
import { motion } from 'framer-motion';

export function TopUsersTokensCost({ windowSel, limit = 5 }: { windowSel: '24h'|'7j'|'30j'; limit?: number }) {
  const [data, setData] = useState<{ window: string; top: Array<{ userId: string; email?: string | null; username?: string | null; displayName?: string | null; promptTokens: number; completionTokens: number; costUsd: number; series: { dates: string[]; tokens: number[]; costUsd: number[] } }> } | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const res = await fetch(`/api/admin/users/metrics/top?window=${windowSel}&limit=${limit}`, { cache: 'no-store' });
      if (!mounted) return;
      if (res.ok) setData(await res.json());
    };
    load();
    return () => { mounted = false; };
  }, [windowSel, limit]);

  const formatUsd = (v: number) => `$${(v ?? 0).toFixed(2)}`;

  const barData = useMemo(() => {
    if (!data?.top) return [];
    return data.top.map(r => {
      const name = (r.displayName || r.username || (r.email ? r.email.split('@')[0] : null) || r.userId).toString();
      return {
        user: name.substring(0, 12),
        'Tokens prompt': r.promptTokens,
        'Tokens completion': r.completionTokens,
        cost: r.costUsd,
      };
    });
  }, [data]);

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

  return (
    <BentoCard variant="panel" size="md" delay={0.6} lift className="p-6 min-h-[400px]">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Top utilisateurs</h2>
        <div className="glass-card-secondary px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground">
          {windowSel}
        </div>
      </div>
      <div className="w-full h-[300px]">
        <ResponsiveBar
          data={barData}
          theme={theme}
          keys={['Tokens prompt', 'Tokens completion']}
          indexBy="user"
          margin={{ top: 20, right: 100, bottom: 50, left: 60 }}
          padding={0.3}
          valueScale={{ type: 'linear' }}
          indexScale={{ type: 'band', round: true }}
          colors={['#0ea5e9', '#22c55e']}
          borderRadius={6}
          borderColor={{ from: 'color', modifiers: [['darker', 0.3]] }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -45,
            legend: 'Utilisateur',
            legendPosition: 'middle',
            legendOffset: 42,
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Tokens',
            legendPosition: 'middle',
            legendOffset: -50,
          }}
          labelSkipWidth={12}
          labelSkipHeight={12}
          labelTextColor={{ from: 'color', modifiers: [['darker', 3]] }}
          legends={[
            {
              dataFrom: 'keys',
              anchor: 'bottom-right',
              direction: 'column',
              justify: false,
              translateX: 90,
              translateY: 0,
              itemsSpacing: 2,
              itemWidth: 80,
              itemHeight: 20,
              itemDirection: 'left-to-right',
              itemOpacity: 0.85,
              symbolSize: 12,
              symbolShape: 'circle',
            },
          ]}
          enableLabel={false}
        />
      </div>
      
      <div className="mt-4 grid grid-cols-1 gap-2">
        {data?.top?.slice(0, 3).map((r, idx) => (
          <motion.div
            key={r.userId}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + (idx * 0.05), duration: 0.2 }}
            className="glass-card-secondary rounded-lg p-3 flex items-center justify-between hover:bg-white/60 dark:hover:bg-black/30 transition-all duration-200"
          >
            <a className="text-sm font-semibold text-brand hover:underline" href={`/admin/users/${encodeURIComponent(r.userId)}/metrics?window=${windowSel}`}>
              {(r.displayName || r.username || (r.email ? r.email.split('@')[0] : null) || r.userId)}
            </a>
            <span className="text-lg font-black text-emerald-600">{formatUsd(r.costUsd)}</span>
          </motion.div>
        ))}
      </div>
    </BentoCard>
  );
}