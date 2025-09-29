"use client";
import { useEffect, useRef, useState } from 'react';
import { Input } from '@repo/ui';

export type Suggestion = { id: string; email: string };

export function SearchAutocomplete({ value, onChange, onSelect }: { value: string; onChange: (v: string) => void; onSelect: (s: Suggestion) => void; }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const acRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!value || value.trim().length < 2) { setItems([]); setOpen(false); return; }
    const t = setTimeout(async () => {
      acRef.current?.abort();
      const ac = new AbortController();
      acRef.current = ac;
      setLoading(true);
      const params = new URLSearchParams();
      params.set('q', value.trim());
      params.set('page', '1');
      params.set('limit', '10');
      try {
        const res = await fetch(`/api/admin/users?${params.toString()}`, { cache: 'no-store', signal: ac.signal });
        if (res.ok) {
          const data = await res.json();
          const next: Suggestion[] = (data.items || []).map((u: any) => ({ id: u.id, email: u.email }));
          setItems(next);
          setOpen(next.length > 0);
        }
      } catch {}
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onClickOutside);
    return () => document.removeEventListener('click', onClickOutside);
  }, []);

  return (
    <div className="relative w-full">
      <Input value={value} onChange={(e) => { onChange(e.target.value); }} placeholder="ex: jean.dupont@example.com" aria-label="Rechercher par email" />
      {open && (
        <div ref={listRef} className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border bg-background shadow">
          {items.map((s) => (
            <button key={s.id} className="w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { onSelect(s); setOpen(false); }}>
              {s.email}
            </button>
          ))}
          {items.length === 0 && !loading && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Aucun résultat</div>
          )}
        </div>
      )}
    </div>
  );
}
