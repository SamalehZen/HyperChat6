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

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const MAX_IMAGE_FILE_SIZE = 3 * 1024 * 1024;
const MAX_PDF_FILE_SIZE = 10 * 1024 * 1024;
const MAX_ATTACHMENTS = 10;

export const useImageAttachment = () => {
    const imageAttachments = useChatStore(state => state.imageAttachments);
    const setImageAttachments = useChatStore(state => state.setImageAttachments);
    const clearImageAttachments = useChatStore(state => state.clearImageAttachments);
    const chatMode = useChatStore(state => state.chatMode);

    const { toast } = useToast();

    const acceptMap = useMemo(() => {
        const base: Record<string, string[]> = {
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/gif': ['.gif'],
        };
        if (chatMode === ChatMode.GEMINI_2_5_FLASH) {
            base['application/pdf'] = ['.pdf'];
        }
        return base;
    }, [chatMode]);

    const readFilesToAttachments = async (files: File[]): Promise<{ base64?: string; file?: File }[]> => {
        const results: { base64?: string; file?: File }[] = [];
        const pdfAllowed = chatMode === ChatMode.GEMINI_2_5_FLASH;

        for (const file of files) {
            const isPDF = file.type === 'application/pdf';
            const isSupportedType = IMAGE_TYPES.includes(file.type) || (pdfAllowed && isPDF);
            if (!isSupportedType) {
                toast({
                    title: 'Invalid format',
                    description: pdfAllowed
                        ? 'Please select a valid image (JPEG, PNG, GIF) or PDF.'
                        : 'Please select a valid image (JPEG, PNG, GIF).',
                    variant: 'destructive',
                });
                continue;
            }
            if (isPDF) {
                if (file.size > MAX_PDF_FILE_SIZE) {
                    toast({
                        title: 'File too large',
                        description: 'PDF size should be less than 10MB.',
                        variant: 'destructive',
                    });
                    continue;
                }
            } else {
                if (file.size > MAX_IMAGE_FILE_SIZE) {
                    toast({
                        title: 'File too large',
                        description: 'Image size should be less than 3MB.',
                        variant: 'destructive',
                    });
                    continue;
                }
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
        const pdfAllowed = chatMode === ChatMode.GEMINI_2_5_FLASH;
        let availableSlots = Math.max(0, MAX_ATTACHMENTS - (imageAttachments?.length || 0));
        if (availableSlots <= 0) {
            toast({
                title: 'Limit reached',
                description: `Maximum ${MAX_ATTACHMENTS} ${pdfAllowed ? 'files' : 'images'} per message.`,
                variant: 'destructive',
            });
            return;
        }

        const filesToProcess = files.slice(0, availableSlots);
        if (files.length > availableSlots) {
            toast({
                title: pdfAllowed ? 'Some files not added' : 'Some images not added',
                description: `Only ${availableSlots} more ${pdfAllowed ? 'file(s)' : 'image(s)'} can be attached (max ${MAX_ATTACHMENTS}).`,
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
        e.target.value = '';
    };

    return {
        dropzonProps,
        handleImageUpload,
        readImageFile,
        clearAttachment,
    };
};