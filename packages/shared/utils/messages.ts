import { FileAttachment, ThreadItem } from '@repo/shared/types';

export const buildCoreMessagesFromThreadItems = ({
    messages,
    query,
    imageAttachments,
    fileAttachments,
}: {
    messages: ThreadItem[];
    query: string;
    imageAttachments?: string[];
    fileAttachments?: FileAttachment[];
}) => {
    const coreMessages = [
        ...(messages || []).flatMap(item => {
            const imgs = Array.isArray(item.imageAttachment)
                ? item.imageAttachment
                : item.imageAttachment
                ? [item.imageAttachment as unknown as string]
                : [];

            const files = Array.isArray(item.fileAttachments) ? item.fileAttachments : [];

            const hasAttachments = imgs.length > 0 || files.length > 0;

            const userContent:
                | string
                | Array<
                      | { type: 'text'; text: string }
                      | { type: 'image'; image: string }
                      | { type: 'file'; mimeType: string; data: string; name?: string }
                  > = hasAttachments
                ? ([
                      { type: 'text', text: item.query || '' },
                      ...imgs.map(img => ({ type: 'image', image: img })),
                      ...files.map(f => ({ type: 'file', mimeType: f.mimeType, data: f.base64, name: f.name })),
                  ] as Array<
                      | { type: 'text'; text: string }
                      | { type: 'image'; image: string }
                      | { type: 'file'; mimeType: string; data: string; name?: string }
                  >)
                : item.query || '';

            return [
                {
                    role: 'user' as const,
                    content: userContent,
                },
                {
                    role: 'assistant' as const,
                    content: item.answer?.text || '',
                },
            ];
        }),
        (() => {
            const hasNewAttachments = (imageAttachments && imageAttachments.length > 0) || (fileAttachments && fileAttachments.length > 0);
            const finalContent:
                | string
                | Array<
                      | { type: 'text'; text: string }
                      | { type: 'image'; image: string }
                      | { type: 'file'; mimeType: string; data: string; name?: string }
                  > = hasNewAttachments
                ? ([
                      { type: 'text', text: query || '' },
                      ...(imageAttachments || []).map(img => ({ type: 'image', image: img })),
                      ...(fileAttachments || []).map(f => ({ type: 'file', mimeType: f.mimeType, data: f.base64, name: f.name })),
                  ] as Array<
                      | { type: 'text'; text: string }
                      | { type: 'image'; image: string }
                      | { type: 'file'; mimeType: string; data: string; name?: string }
                  >)
                : query || '';
            return {
                role: 'user' as const,
                content: finalContent,
            };
        })(),
    ];

    return coreMessages ?? [];
};