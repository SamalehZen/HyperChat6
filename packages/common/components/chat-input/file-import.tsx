"use client";

import { useAuth } from '@repo/common/context';
import { useChatStore } from '@repo/common/store';
import { ChatMode } from '@repo/shared/config';
import { Button, Tooltip, useToast, cn } from '@repo/ui';
import { useI18n } from '@repo/common/i18n';
import { IconPaperclip } from '../icons';
import * as XLSX from 'xlsx';
import React from 'react';

const EXPECTED_HEADERS = [
  'libelle_principal',
  'code_barres_initial',
  'numero_fournisseur_unique',
  'numero_article',
] as const;

function normalizeHeader(values: any[]): string[] {
  return (values || []).map((v) => String(v ?? '').trim());
}

function isExactHeader(arr: string[]) {
  if (!arr || arr.length < EXPECTED_HEADERS.length) return false;
  const sliced = arr.slice(0, EXPECTED_HEADERS.length);
  return EXPECTED_HEADERS.every((h, i) => sliced[i] === h);
}

function parseCsvText(text: string) {
  const lines = (text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { headerOk: false, rows: [] as string[][] };
  const header = normalizeHeader(lines[0].split(','));
  const headerOk = isExactHeader(header);
  const rows = lines.slice(1).map((l) => l.split(','));
  return { headerOk, rows };
}

function toNormalizedCSV(rows: Array<Record<typeof EXPECTED_HEADERS[number], string>>) {
  const header = EXPECTED_HEADERS.join(',');
  const data = rows.map((r) =>
    [r.libelle_principal, r.code_barres_initial, r.numero_fournisseur_unique, r.numero_article]
      .map((v) => (v ?? '').toString().replace(/\r|\n/g, ' ').trim())
      .join(',')
  );
  return [header, ...data].join('\n');
}

export const FileImport: React.FC = () => {
  const chatMode = useChatStore((s) => s.chatMode);
  const setInputValue = useChatStore((s) => s.setInputValue);
  const { isSignedIn } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (chatMode !== ChatMode.CREATION_D_ARTICLE || !isSignedIn) return null;

  const handlePick = () => fileInputRef.current?.click();

  const handleFile = async (file: File) => {
    try {
      toast({ title: t('article.import.reading') });

      let records: Array<Record<typeof EXPECTED_HEADERS[number], string>> = [];

      if (file.name.toLowerCase().endsWith('.xlsx')) {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const firstSheetName = wb.SheetNames[0];
        if (!firstSheetName) throw new Error('No sheet');
        const ws = wb.Sheets[firstSheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const header = normalizeHeader(rows[0] || []);
        if (!isExactHeader(header)) {
          toast({ title: t('article.import.error', { reason: t('article.import.headerError') }), variant: 'destructive' });
          return;
        }
        const idx = {
          lib: header.indexOf('libelle_principal'),
          ean: header.indexOf('code_barres_initial'),
          nor: header.indexOf('numero_fournisseur_unique'),
          art: header.indexOf('numero_article'),
        };
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] || [];
          const lib = String(row[idx.lib] ?? '').trim();
          const ean = String(row[idx.ean] ?? '').trim();
          const nor = String(row[idx.nor] ?? '').trim();
          const art = String(row[idx.art] ?? '').trim();
          if (!lib || !ean || !nor || !art) continue;
          if (ean.length > 20) continue;
          records.push({
            libelle_principal: lib,
            code_barres_initial: ean,
            numero_fournisseur_unique: nor,
            numero_article: art,
          });
        }
      } else if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text();
        const { headerOk, rows } = parseCsvText(text);
        if (!headerOk) {
          toast({ title: t('article.import.error', { reason: t('article.import.headerError') }), variant: 'destructive' });
          return;
        }
        for (const row of rows) {
          const cols = normalizeHeader(row);
          const [lib, ean, nor, art] = cols;
          if (!lib || !ean || !nor || !art) continue;
          if (ean.length > 20) continue;
          records.push({
            libelle_principal: lib,
            code_barres_initial: ean,
            numero_fournisseur_unique: nor,
            numero_article: art,
          });
        }
      } else {
        toast({ title: t('article.import.error', { reason: 'Unsupported file' }), variant: 'destructive' });
        return;
      }

      let truncated = 0;
      if (records.length > 300) {
        truncated = records.length - 300;
        records = records.slice(0, 300);
      }

      const csv = toNormalizedCSV(records);

      if (truncated > 0) {
        toast({ title: t('article.import.truncated', { count: truncated }) });
      }
      toast({ title: t('article.import.successPreview', { count: records.length }) });

      setInputValue(csv);
    } catch (e: any) {
      toast({ title: t('article.import.error', { reason: e?.message || 'Unknown' }), variant: 'destructive' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="mb-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <Tooltip content={t('article.import.title')}>
          <Button variant="ghost" size="icon-sm" onClick={handlePick}>
            <IconPaperclip size={16} strokeWidth={2} />
          </Button>
        </Tooltip>
        <span className="text-xs text-muted-foreground">{t('article.import.selectFile')}</span>
      </div>
      <div className="flex items-center gap-3">
        <a className={cn('text-xs underline text-muted-foreground hover:text-foreground')} href="/templates/article_import_template.csv" download>
          {t('article.import.template')} (.csv)
        </a>
        <a className={cn('text-xs underline text-muted-foreground hover:text-foreground')} href="/templates/article_import_template.xlsx" download>
          {t('article.import.template')} (.xlsx)
        </a>
      </div>
    </div>
  );
};
