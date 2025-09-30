"use client";
import { useEffect, useState } from 'react';
import { Button } from '@repo/ui';
import { BentoCard } from './bento-card';
import { motion } from 'framer-motion';

export function RecentEventsPanel({ defaultLimit = 25, showFilters = true }: { defaultLimit?: number; showFilters?: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const [limit, setLimit] = useState(defaultLimit);
  const [types, setTypes] = useState<string[]>([]);

  const load = async (currentLimit = limit, currentTypes = types) => {
    const params = new URLSearchParams();
    params.set('limit', String(currentLimit));
    if (currentTypes.length) params.set('types', currentTypes.join(','));
    const res = await fetch(`/api/admin/events/recent?${params.toString()}`, { cache: 'no-store' });
    if (res.ok) setItems((await res.json()).items);
  };

  useEffect(() => { load(); }, []);

  const toggleType = (t: string) => {
    setTypes((prev) => {
      const next = prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t];
      load(limit, next);
      return next;
    });
  };

  const allTypes = ['login_failed','lockout','unlock','suspend','unsuspend','delete','account_created','account_updated'];
  
  const getEventBadge = (action: string) => {
    const badges: Record<string, { bg: string; text: string; icon: string }> = {
      'login_failed': { bg: 'bg-red-500/10', text: 'text-red-600', icon: '🚫' },
      'lockout': { bg: 'bg-amber-500/10', text: 'text-amber-600', icon: '🔒' },
      'unlock': { bg: 'bg-emerald-500/10', text: 'text-emerald-600', icon: '🔓' },
      'suspend': { bg: 'bg-amber-500/10', text: 'text-amber-600', icon: '⏸️' },
      'unsuspend': { bg: 'bg-emerald-500/10', text: 'text-emerald-600', icon: '▶️' },
      'delete': { bg: 'bg-red-500/10', text: 'text-red-600', icon: '🗑️' },
      'account_created': { bg: 'bg-sky-500/10', text: 'text-sky-600', icon: '✨' },
      'account_updated': { bg: 'bg-sky-500/10', text: 'text-sky-600', icon: '🔄' },
    };
    return badges[action] || { bg: 'bg-muted', text: 'text-muted-foreground', icon: '•' };
  };

  return (
    <BentoCard variant="panel" size="md" delay={0.8} lift className="p-6 min-h-[400px]">
      <div className="mb-5 flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-foreground">Événements récents</h2>
        {showFilters && (
          <div className="flex flex-wrap gap-1.5">
            {allTypes.slice(0, 4).map((t) => (
              <label key={t} className={`glass-card-secondary px-2.5 py-1 rounded-md text-xs cursor-pointer transition-all duration-200 ${types.includes(t) ? 'bg-brand text-white font-semibold shadow-sm' : 'hover:bg-white/60 dark:hover:bg-black/30'}`}>
                <input type="checkbox" className="mr-1.5 align-middle" checked={types.includes(t)} onChange={() => toggleType(t)} />
                {t.replace('_', ' ')}
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-2 max-h-[280px] overflow-y-auto no-scrollbar">
        {items.slice(0, 8).map((it, idx) => {
          const badge = getEventBadge(it.action);
          return (
            <motion.div 
              key={it.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.2 }}
              className="glass-card-secondary rounded-lg p-3 hover:bg-white/60 dark:hover:bg-black/30 transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-lg">{badge.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-semibold ${badge.bg} ${badge.text}`}>
                        {it.action}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">
                        {new Date(it.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {it.ip && `🌐 ${it.ip}`}
                      {it.city && ` • 📍 ${[it.city, it.country].filter(Boolean).join(', ')}`}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </BentoCard>
  );
}