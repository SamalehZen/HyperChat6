import fs from 'fs';
import path from 'path';
import os from 'os';
import { NextRequest, NextResponse } from 'next/server';

const EXPORT_DIR = process.env.EXPORT_DIR || path.join(os.tmpdir(), 'hyperchat-exports');

export async function GET(_req: NextRequest, { params }: { params: { file: string } }) {
  const file = params.file || '';
  if (!/^[a-zA-Z0-9._-]+$/.test(file)) {
    return NextResponse.json({ error: 'Invalid file name' }, { status: 400 });
  }

  const fullPath = path.join(EXPORT_DIR, file);
  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const ext = path.extname(file).toLowerCase();
  const stat = fs.statSync(fullPath);
  let contentType = 'application/octet-stream';
  if (ext === '.csv') contentType = 'text/csv; charset=utf-8';
  if (ext === '.xlsx') {
    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  const stream = fs.createReadStream(fullPath);
  return new Response(stream as any, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': stat.size.toString(),
      'Content-Disposition': `attachment; filename="${file}"`,
      'Cache-Control': 'no-store',
    },
  });
}
