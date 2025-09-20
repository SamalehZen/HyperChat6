import { NextRequest } from 'next/server';
import pdfParse from 'pdf-parse';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const files = formData.getAll('file') as File[];

        if (!files || files.length === 0) {
            return new Response(
                JSON.stringify({ error: 'No files provided' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const MAX_FILE_SIZE_PDF = 20 * 1024 * 1024; // 20MB per file
        const texts: { filename?: string; text: string }[] = [];

        for (const file of files) {
            if (file.type !== 'application/pdf') {
                return new Response(
                    JSON.stringify({ error: 'Only PDF files are supported' }),
                    { status: 400, headers: { 'Content-Type': 'application/json' } }
                );
            }

            if (file.size > MAX_FILE_SIZE_PDF) {
                return new Response(
                    JSON.stringify({ error: 'PDF exceeds 20MB limit', filename: (file as any).name }),
                    { status: 413, headers: { 'Content-Type': 'application/json' } }
                );
            }

            const buffer = Buffer.from(await file.arrayBuffer());

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);

            try {
                const data = await pdfParse(buffer);
                const rawText = (data?.text || '').trim();
                texts.push({ filename: (file as any).name, text: rawText });
            } catch (err: any) {
                if (controller.signal.aborted) {
                    return new Response(
                        JSON.stringify({ error: 'Extraction timed out' }),
                        { status: 504, headers: { 'Content-Type': 'application/json' } }
                    );
                }
                return new Response(
                    JSON.stringify({ error: err?.message || 'Failed to parse PDF' }),
                    { status: 500, headers: { 'Content-Type': 'application/json' } }
                );
            } finally {
                clearTimeout(timeout);
            }
        }

        // Combine and lightly truncate to keep payloads reasonable
        const combined = texts.map(t => `${t.filename ? `[${t.filename}]\n` : ''}${t.text}`).join('\n\n');
        const MAX_OUTPUT = 200_000; // char limit
        const combinedText = combined.length > MAX_OUTPUT ? combined.slice(0, MAX_OUTPUT) + '\n... [truncated]' : combined;

        return new Response(
            JSON.stringify({ texts, combinedText }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error?.message || 'Unexpected server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
