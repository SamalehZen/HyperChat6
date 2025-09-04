import { IconCornerDownRight } from '@tabler/icons-react';

export const ImageMessage = ({ imageAttachments = [] as any }: { imageAttachments?: string[] | string }) => {
    const imgs = Array.isArray(imageAttachments)
        ? imageAttachments
        : typeof imageAttachments === 'string' && imageAttachments
        ? [imageAttachments]
        : [];
    if (!imgs.length) return null;
    return (
        <div className="flex flex-row items-start gap-2 p-1 w-full">
            <IconCornerDownRight size={16} className="text-muted-foreground/50 mt-1" />
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {imgs.map((src, idx) => (
                    <img key={idx} src={src} alt={`image ${idx + 1}`} className="h-12 w-12 rounded-lg object-cover" />
                ))}
            </div>
        </div>
    );
};