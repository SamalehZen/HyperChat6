import { useChatStore } from '@repo/common/store';
import { Button, Flex } from '@repo/ui';
import { X } from 'lucide-react';
import Image from 'next/image';
import { IconMarkdown } from '../icons';

export const FileAttachment = () => {
    const attachments = useChatStore(state => state.fileAttachments);
    const clearAttachments = useChatStore(state => state.clearFileAttachments as () => void);
    const removeAttachment = useChatStore(state => state.removeFileAttachment as (index: number) => void);

    if (!attachments || attachments.length === 0) return null;

    return (
        <Flex className="pl-2 pr-2 pt-2 md:pl-3" gap="sm" direction="col">
            <div className="text-xs text-muted-foreground">{attachments.length} fichier{attachments.length > 1 ? 's' : ''} attaché{attachments.length > 1 ? 's' : ''}</div>
            <div className="flex flex-wrap gap-2">
                {attachments.map((att, idx) => (
                    <div key={idx} className="relative h-[40px] min-w-[40px] rounded-lg border border-black/10 px-1 shadow-sm dark:border-white/10 flex items-center justify-center overflow-hidden">
                        {att.mimeType.startsWith('image/') ? (
                            <Image src={att.base64} alt={`uploaded file ${idx + 1}`} className="h-full w-full overflow-hidden rounded-lg object-cover" width={40} height={40} />
                        ) : (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <IconMarkdown size={14} />
                                <span className="max-w-[80px] truncate" title={att.name}>{att.name}</span>
                            </div>
                        )}
                        <Button size={'icon-xs'} variant="default" onClick={() => removeAttachment(idx)} className="absolute right-[-4px] top-[-4px] z-10 h-4 w-4 flex-shrink-0">
                            <X size={12} strokeWidth={2} />
                        </Button>
                    </div>
                ))}
                <Button size={'xs'} variant="bordered" onClick={clearAttachments} className="h-6 px-2 text-xs">
                    Tout effacer
                </Button>
            </div>
        </Flex>
    );
};