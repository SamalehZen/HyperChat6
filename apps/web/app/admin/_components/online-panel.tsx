"use client";
import { useEffect, useState } from 'react';
import { BentoCard } from './bento-card';
import { motion } from 'framer-motion';

export function OnlinePanel() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const res = await fetch('/api/admin/online', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (!cancelled) setItems(data.items);
      }
    };
    load();
    const id = setInterval(load, 10_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return (
    <BentoCard variant="panel" size="md" delay={0.7} lift className="p-6 min-h-[400px]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Utilisateurs en ligne</h2>
        <div className="flex items-center gap-2.5">
          <motion.div 
            className="h-2.5 w-2.5 rounded-full bg-emerald-500"
            animate={{ 
              boxShadow: [
                '0 0 8px rgba(34, 197, 94, 0.4)',
                '0 0 16px rgba(34, 197, 94, 0.6)',
                '0 0 8px rgba(34, 197, 94, 0.4)',
              ],
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <span className="text-sm font-bold text-foreground">{items.length}</span>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun utilisateur en ligne</p>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {items.slice(0, 6).map((u, idx) => (
            <motion.div 
              key={u.userId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              className="glass-card-secondary rounded-lg p-3 relative overflow-hidden group hover:bg-white/60 dark:hover:bg-black/30 transition-all duration-200"
            >
              <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <div className="font-semibold text-foreground text-sm mb-1.5">{u.email}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>📍 {[u.lastCity, u.lastCountry].filter(Boolean).join(', ') || '-'}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </BentoCard>
  );
}