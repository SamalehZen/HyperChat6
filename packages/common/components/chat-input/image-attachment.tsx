import { useChatStore } from '@repo/common/store';
import { Button, Flex } from '@repo/ui';
import { X } from 'lucide-react';
import Image from 'next/image';

export const ImageAttachment = () => {
    const attachments = useChatStore(state => state.imageAttachments);
    const clearAttachments = useChatStore(state => state.clearImageAttachments);
    const removeAttachment = useChatStore(state => state.removeImageAttachment);

    if (!attachments || attachments.length === 0) return null;

    return (
        <Flex className="pl-2 pr-2 pt-2 md:pl-3" gap="sm" direction="col">
            <div className="text-xs text-muted-foreground">{attachments.length} attachment{attachments.length > 1 ? 's' : ''}</div>
            <div className="flex flex-wrap gap-2">
                {attachments.map((att, idx) => {
                    const isPdf = att.base64?.startsWith('data:application/pdf');
                    return (
                        <div key={idx} className="relative h-[40px] w-[40px] rounded-lg border border-black/10 shadow-sm dark:border-white/10 overflow-hidden">
                            {att.base64 && !isPdf && (
                                <Image
                                    src={att.base64}
                                    alt={`uploaded image ${idx + 1}`}
                                    className="h-full w-full rounded-lg object-cover"
                                    width={40}
                                    height={40}
                                />
                            )}
                            {isPdf && (
                                <div className="bg-muted flex h-full w-full items-center justify-center text-[10px] font-medium">
                                    PDF
                                </div>
                            )}
                            <Button
                                size={'icon-xs'}
                                variant="default"
                                onClick={() => removeAttachment(idx)}
                                className="absolute right-[-4px] top-[-4px] z-10 h-4 w-4 flex-shrink-0"
                            >
                                <X size={12} strokeWidth={2} />
                            </Button>
                        </div>
                    );
                })}
                <Button
                    size={'xs'}
                    variant="bordered"
                    onClick={clearAttachments}
                    className="h-6 px-2 text-xs"
                >
                    Clear all
                </Button>
            </div>
        </Flex>
    );
};