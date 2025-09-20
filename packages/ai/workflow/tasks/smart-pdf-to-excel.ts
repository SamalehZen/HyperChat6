import { createTask } from '@repo/orchestrator';
import { ModelEnum } from '../../models';
import { WorkflowContextSchema, WorkflowEventSchema } from '../flow';
import { generateText, handleError, sendEvents } from '../utils';
import { SMART_PDF_TO_EXCEL_PROMPT } from './smart-pdf-to-excel-prompt';

export const smartPdfToExcelTask = createTask<WorkflowEventSchema, WorkflowContextSchema>({
    name: 'smart-pdf-to-excel',
    execute: async ({ events, context, signal }) => {
        const messages = context?.get('messages') || [];
        const { updateAnswer, updateStatus } = sendEvents(events);

        updateAnswer({ text: '', status: 'PENDING' });

        const response = await generateText({
            prompt: SMART_PDF_TO_EXCEL_PROMPT,
            model: ModelEnum.GEMINI_2_5_FLASH,
            messages,
            signal,
            onChunk: (chunk) => {
                updateAnswer({ text: chunk, status: 'PENDING' });
            },
        });

        updateAnswer({
            text: '',
            finalText: response,
            status: 'COMPLETED',
        });

        // Parse tables and plain text
        const parseExtraction = (text: string) => {
            const tables: Array<{ name?: string; headers: string[]; rows: string[][] }> = [];
            const lines = text.split('\n');
            let i = 0;
            while (i < lines.length) {
                if (lines[i].trim().startsWith('|') && lines[i].includes('|')) {
                    const headerLine = lines[i].trim();
                    const dividerLine = lines[i + 1]?.trim() || '';
                    if (dividerLine.startsWith('|') && dividerLine.includes('-')) {
                        const headers = headerLine.split('|').map(s => s.trim()).filter(Boolean);
                        i += 2;
                        const rows: string[][] = [];
                        while (i < lines.length && lines[i].trim().startsWith('|')) {
                            const row = lines[i].split('|').map(s => s.trim()).filter(Boolean);
                            if (row.length) rows.push(row);
                            i++;
                        }
                        tables.push({ headers, rows });
                        continue;
                    }
                }
                i++;
            }
            const rawIndex = text.indexOf('TEXTE_BRUT');
            let plainText = '';
            if (rawIndex !== -1) plainText = text.substring(rawIndex + 'TEXTE_BRUT'.length).trim();
            else plainText = text.trim();
            return { tables, plainText };
        };

        const extraction = parseExtraction(response || '');
        events?.update('object', _ => extraction);

        context?.get('onFinish')?.({
            answer: response,
            threadId: context?.get('threadId'),
            threadItemId: context?.get('threadItemId'),
        });

        updateStatus('COMPLETED');
        context?.update('answer', _ => response);

        return response;
    },
    onError: handleError,
    route: ({ context }) => {
        if (context?.get('showSuggestions') && context.get('answer')) {
            return 'suggestions';
        }
        return 'end';
    },
});
