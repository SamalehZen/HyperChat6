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
            return [
                {
                    role: 'user' as const,
                    content:
                        imgs.length > 0
                            ? ([
                                  { type: 'text', text: item.query || '' },
                                  ...imgs.map(img => ({ type: 'image', image: img })),
                              ])
                            : item.query || '',
                },
                {
                    role: 'assistant' as const,
                    content: item.answer?.text || '',
                },
            ];
        }),
        {
            role: 'user' as const,
            content:
                (imageAttachments && imageAttachments.length > 0)
                    ? ([
                          { type: 'text', text: query || '' },
                          ...imageAttachments.map(img => ({ type: 'image', image: img })),
                      ])
                    : query || '',
        },
    ];

    return coreMessages ?? [];
};