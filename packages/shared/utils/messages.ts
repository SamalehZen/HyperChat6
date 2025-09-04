import { ThreadItem } from '@repo/shared/types';

export const buildCoreMessagesFromThreadItems = ({
    messages,
    query,
    imageAttachments,
}: {
    messages: ThreadItem[];
    query: string;
    imageAttachments?: string[];
}) => {
    const coreMessages = [
        ...(messages || []).flatMap(item => {
            const imgs = Array.isArray(item.imageAttachment)
                ? item.imageAttachment
                : item.imageAttachment
                ? [item.imageAttachment as unknown as string]
                : [];

            const userContent: string | Array<{ type: 'text'; text: string } | { type: 'image'; image: string }> =
                imgs.length > 0
                    ? ([
                          { type: 'text', text: item.query || '' },
                          ...imgs.map(img => ({ type: 'image', image: img })),
                      ] as Array<{ type: 'text'; text: string } | { type: 'image'; image: string }>)
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
            const finalContent: string | Array<{ type: 'text'; text: string } | { type: 'image'; image: string }> =
                imageAttachments && imageAttachments.length > 0
                    ? ([
                          { type: 'text', text: query || '' },
                          ...imageAttachments.map(img => ({ type: 'image', image: img })),
                      ] as Array<{ type: 'text'; text: string } | { type: 'image'; image: string }>)
                    : query || '';
            return {
                role: 'user' as const,
                content: finalContent,
            };
        })(),
    ];

    return coreMessages ?? [];
};