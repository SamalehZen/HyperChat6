import { useChatStore } from '@repo/common/store';
import { ChatMode } from '@repo/shared/config';
import { useToast } from '@repo/ui';
import { ChangeEvent, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';

export type TRenderImageUpload = {
    showIcon?: boolean;
    label?: string;
    tooltip?: string;
};

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'] as const;
const MAX_FILE_SIZE_IMAGE = 3 * 1024 * 1024; // 3MB
const MAX_FILE_SIZE_PDF = 20 * 1024 * 1024; // 20MB
const MAX_ATTACHMENTS = 10; // adjust between 5-10 as needed

export const useImageAttachment = () => {
    const imageAttachments = useChatStore(state => state.imageAttachments);
    const setImageAttachments = useChatStore(state => state.setImageAttachments);
    const clearImageAttachments = useChatStore(state => state.clearImageAttachments);
    const chatMode = useChatStore(state => state.chatMode);

    const { toast } = useToast();

    const allowPdf = useMemo(
        () => chatMode === ChatMode.GEMINI_2_5_FLASH || chatMode === ChatMode.SMART_PDF_TO_EXCEL,
        [chatMode]
    );

    const SUPPORTED_TYPES = useMemo(
        () => [...IMAGE_TYPES, ...(allowPdf ? ['application/pdf'] : [])],
        [allowPdf]
    );

    const readFilesToAttachments = async (files: File[]): Promise<{ base64?: string; file?: File }[]> => {
        const results: { base64?: string; file?: File }[] = [];

        for (const file of files) {
            const isPdf = file.type === 'application/pdf';
            const isSupported = SUPPORTED_TYPES.includes(file.type as any);

            if (!isSupported) {
                toast({
                    title: 'Invalid format',
                    description: allowPdf
                        ? 'Please select an image (JPEG, PNG, GIF) or a PDF.'
                        : 'Please select a valid image (JPEG, PNG, GIF).',
                    variant: 'destructive',
                });
                continue;
            }

            if (!isPdf && file.size > MAX_FILE_SIZE_IMAGE) {
                toast({
                    title: 'File too large',
                    description: 'Image size should be less than 3MB.',
                    variant: 'destructive',
                });
                continue;
            }

            if (isPdf && file.size > MAX_FILE_SIZE_PDF) {
                toast({
                    title: 'PDF too large',
                    description: 'PDF size should be less than 20MB.',
                    variant: 'destructive',
                });
                continue;
            }

            if (isPdf) {
                results.push({ file });
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
        let availableSlots = Math.max(0, MAX_ATTACHMENTS - (imageAttachments?.length || 0));
        if (availableSlots <= 0) {
            toast({
                title: 'Limit reached',
                description: `Maximum ${MAX_ATTACHMENTS} attachments per message.`,
                variant: 'destructive',
            });
            return;
        }

        const filesToProcess = files.slice(0, availableSlots);
        if (files.length > availableSlots) {
            toast({
                title: 'Some files not added',
                description: `Only ${availableSlots} more attachment(s) can be added (max ${MAX_ATTACHMENTS}).`,
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
    }, [imageAttachments, allowPdf]);

    const dropzonProps = useDropzone({
        onDrop,
        multiple: true,
        noClick: true,
        accept: {
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/gif': ['.gif'],
            ...(allowPdf ? { 'application/pdf': ['.pdf'] } : {}),
        },
    });

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
        e.target.value = '';
    };

    return {
        dropzonProps,
        handleImageUpload,
        readImageFile,
        clearAttachment,
    };
};