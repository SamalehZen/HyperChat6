import { useChatStore } from '@repo/common/store';
import { useToast } from '@repo/ui';
import { ChangeEvent, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { ChatMode } from '@repo/shared/config';

export type TRenderImageUpload = {
    showIcon?: boolean;
    label?: string;
    tooltip?: string;
};

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const MAX_IMAGE_FILE_SIZE = 3 * 1024 * 1024; // 3MB
const MAX_PDF_FILE_SIZE = 10 * 1024 * 1024; // 10MB for PDFs
const MAX_FILES = 10; // max attachments per message (images or pages aggregate enforced server-side)

export const useImageAttachment = () => {
    const imageAttachments = useChatStore(state => state.imageAttachments);
    const setImageAttachments = useChatStore(state => state.setImageAttachments);
    const clearImageAttachments = useChatStore(state => state.clearImageAttachments);
    const chatMode = useChatStore(state => state.chatMode);

    const { toast } = useToast();

    const readFilesToAttachments = async (files: File[]): Promise<{ base64?: string; file?: File }[]> => {
        const results: { base64?: string; file?: File }[] = [];

        for (const file of files) {
            const isPdf = file.type === 'application/pdf';
            const isImage = IMAGE_TYPES.includes(file.type);

            // Only allow PDFs in Smart PDF/Image → Excel mode
            if (isPdf && chatMode !== ChatMode.SMART_PDF_TO_EXCEL) {
                toast({
                    title: 'Unsupported file type',
                    description: 'PDF upload is only available in Image → Excel mode.',
                    variant: 'destructive',
                });
                continue;
            }

            if (!isImage && !isPdf) {
                toast({
                    title: 'Invalid format',
                    description: 'Please select a valid image (JPEG, PNG, GIF) or a PDF (Image → Excel mode).',
                    variant: 'destructive',
                });
                continue;
            }

            if (isImage && file.size > MAX_IMAGE_FILE_SIZE) {
                toast({
                    title: 'File too large',
                    description: 'Image size should be less than 3MB.',
                    variant: 'destructive',
                });
                continue;
            }

            if (isPdf && file.size > MAX_PDF_FILE_SIZE) {
                toast({
                    title: 'PDF too large',
                    description: 'PDF size should be less than 10MB.',
                    variant: 'destructive',
                });
                continue;
            }

            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    if (typeof reader.result !== 'string') return resolve('');
                    const base64String = reader.result.split(',')[1];
                    resolve(`data:${file.type};base64,${base64String}`);
                };
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(file);
            });

            results.push({ base64, file });
        }

        return results;
    };

    const addFiles = async (files: File[]) => {
        if (!files?.length) return;
        const availableSlots = Math.max(0, MAX_FILES - (imageAttachments?.length || 0));
        if (availableSlots <= 0) {
            toast({
                title: 'Limit reached',
                description: `Maximum ${MAX_FILES} files per message.`,
                variant: 'destructive',
            });
            return;
        }

        const filesToProcess = files.slice(0, availableSlots);
        if (files.length > availableSlots) {
            toast({
                title: 'Some files not added',
                description: `Only ${availableSlots} more file(s) can be attached (max ${MAX_FILES}).`,
                variant: 'destructive',
            });
        }

        const newAttachments = await readFilesToAttachments(filesToProcess);
        if (newAttachments.length) {
            setImageAttachments([...(imageAttachments || []), ...newAttachments]);
        }
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        addFiles(acceptedFiles);
    }, [imageAttachments, chatMode]);

    const acceptMap = useMemo(() => {
        const base: Record<string, string[]> = {
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/gif': ['.gif'],
        };
        if (chatMode === ChatMode.SMART_PDF_TO_EXCEL) {
            base['application/pdf'] = ['.pdf'];
        }
        return base;
    }, [chatMode]);

    const dropzonProps = useDropzone({ onDrop, multiple: true, noClick: true, accept: acceptMap });

    const clearAttachment = () => {
        clearImageAttachments();
    };

    const readImageFile = async (file?: File) => {
        if (!file) return;
        await addFiles([file]);
    };

    const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        await addFiles(files);
        // reset the input to allow re-selecting the same files if needed
        e.target.value = '';
    };

    return {
        dropzonProps,
        handleImageUpload,
        readImageFile,
        clearAttachment,
    };
};