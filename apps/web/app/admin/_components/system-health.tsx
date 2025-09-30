"use client";
import { useEffect, useState } from 'react';
import { Badge, Button } from '@repo/ui';
import { IconCheck, IconX } from '@repo/common/components';
import { BentoCard, BentoGrid } from './bento-card';
import { motion } from 'framer-motion';

type HealthRow = {
  key: string;
  provider: string;
  keyPresent: boolean;
  latencyAvgMs: number;
  latencyP95Ms: number;
  errorRatePct: number;
  status: 'ok' | 'warn' | 'down';
};

export function SystemHealthPanel({ windowSel }: { windowSel: '24h'|'7j'|'30j' }) {
  const [data, setData] = useState<{ window: '24h'|'7j'|'30j'; providers: HealthRow[]; overall: any } | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/admin/health?window=${windowSel}`, { cache: 'no-store' });
      if (res.ok) setData(await res.json());
    };
    load();
  }, [windowSel]);

  const colorBy = (s: HealthRow['status']) => s === 'ok' ? 'text-emerald-600' : s === 'warn' ? 'text-amber-600' : 'text-red-600';
  const badgeBy = (s: HealthRow['status']) => s === 'ok' ? 'bg-emerald-500/10 text-emerald-600' : s === 'warn' ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-600';

  return (
    <BentoCard variant="panel" size="md" delay={0.5} lift className="p-6 min-h-[400px]">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Santé du système</h2>
        <div className="glass-card-secondary px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground">
          {windowSel}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="glass-card rounded-lg p-4 text-center group hover:glow-success transition-all duration-300"
        >
          <div className="text-xs font-semibold text-muted-foreground mb-2">Latence moy.</div>
          <div className="text-2xl font-black text-foreground">{data?.overall?.latencyAvgMs ?? '-'}</div>
          <div className="text-xs text-muted-foreground mt-1">ms</div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="glass-card rounded-lg p-4 text-center group hover:glow-info transition-all duration-300"
        >
          <div className="text-xs font-semibold text-muted-foreground mb-2">Latence p95</div>
          <div className="text-2xl font-black text-foreground">{data?.overall?.latencyP95Ms ?? '-'}</div>
          <div className="text-xs text-muted-foreground mt-1">ms</div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="glass-card rounded-lg p-4 text-center group hover:glow-warning transition-all duration-300"
        >
          <div className="text-xs font-semibold text-muted-foreground mb-2">Erreurs</div>
          <div className="text-2xl font-black text-foreground">{data?.overall?.errorRatePct ?? '-'}</div>
          <div className="text-xs text-muted-foreground mt-1">%</div>
        </motion.div>
      </div>

      <div className="space-y-2 max-h-[200px] overflow-y-auto no-scrollbar">
        {data?.providers?.map((p, idx) => (
          <motion.div
            key={p.provider}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + (idx * 0.05), duration: 0.3 }}
            className="glass-card-secondary rounded-lg p-3 hover:bg-white/60 dark:hover:bg-black/30 transition-all duration-200"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-2 h-2 rounded-full ${p.status === 'ok' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : p.status === 'warn' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
                <span className="font-semibold text-foreground text-sm">{p.provider}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="font-medium text-muted-foreground">{p.latencyP95Ms}ms</span>
                <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-semibold ${badgeBy(p.status)}`}>
                  {p.status === 'ok' ? 'OK' : p.status === 'warn' ? '⚠️' : '❌'}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </BentoCard>
  );
}