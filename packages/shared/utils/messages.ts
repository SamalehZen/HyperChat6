import { ThreadItem } from '@repo/shared/types';

export const buildCoreMessagesFromThreadItems = ({
    messages,
    query,
    imageAttachment,
    imageAttachments,
}: {
    messages: ThreadItem[];
    query: string;
    imageAttachment?: string;
    imageAttachments?: string[];
}) => {
    // Helper pour construire le contenu avec images
    const buildContentWithImages = (text: string, singleImage?: string, multipleImages?: string[]) => {
        const hasImages = singleImage || (multipleImages && multipleImages.length > 0);
        
        if (!hasImages) {
            return text || '';
        }

        const content: Array<{ type: 'text'; text: string } | { type: 'image'; image: string }> = [
            { type: 'text' as const, text: text || '' }
        ];

        // Support ancien système (rétrocompatibilité)
        if (singleImage) {
            content.push({ type: 'image' as const, image: singleImage });
        }

        // Support nouveau système multi-images
        if (multipleImages && multipleImages.length > 0) {
            multipleImages.forEach(image => {
                content.push({ type: 'image' as const, image });
            });
        }

        return content;
    };

    const coreMessages = [
        ...(messages || []).flatMap(item => [
            {
                role: 'user' as const,
                content: buildContentWithImages(
                    item.query || '',
                    item.imageAttachment,
                    item.imageAttachments
                ),
            },
            {
                role: 'assistant' as const,
                content: item.answer?.text || '',
            },
        ]),
        {
            role: 'user' as const,
            content: buildContentWithImages(
                query || '',
                imageAttachment,
                imageAttachments
            ),
        },
    ];

    return coreMessages ?? [];
};
