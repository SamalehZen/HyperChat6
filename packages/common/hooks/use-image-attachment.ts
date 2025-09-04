import { useChatStore } from '@repo/common/store';
import { useToast } from '@repo/ui';
import { ChangeEvent, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

export type TRenderImageUpload = {
    showIcon?: boolean;
    label?: string;
    tooltip?: string;
};

const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
const MAX_IMAGES = 10; // adjust between 5-10 as needed

export const useImageAttachment = () => {
    const imageAttachments = useChatStore(state => state.imageAttachments);
    const setImageAttachments = useChatStore(state => state.setImageAttachments);
    const clearImageAttachments = useChatStore(state => state.clearImageAttachments);

    const { toast } = useToast();

    const readFilesToAttachments = async (files: File[]): Promise<{ base64?: string; file?: File }[]> => {
        const results: { base64?: string; file?: File }[] = [];

        for (const file of files) {
            if (!SUPPORTED_TYPES.includes(file.type)) {
                toast({
                    title: 'Invalid format',
                    description: 'Please select a valid image (JPEG, PNG, GIF).',
                    variant: 'destructive',
                });
                continue;
            }
            if (file.size > MAX_FILE_SIZE) {
                toast({
                    title: 'File too large',
                    description: 'Image size should be less than 3MB.',
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
        let availableSlots = Math.max(0, MAX_IMAGES - (imageAttachments?.length || 0));
        if (availableSlots <= 0) {
            toast({
                title: 'Limit reached',
                description: `Maximum ${MAX_IMAGES} images per message.`,
                variant: 'destructive',
            });
            return;
        }

        const filesToProcess = files.slice(0, availableSlots);
        if (files.length > availableSlots) {
            toast({
                title: 'Some images not added',
                description: `Only ${availableSlots} more image(s) can be attached (max ${MAX_IMAGES}).`,
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
    }, [imageAttachments]);

    const dropzonProps = useDropzone({ onDrop, multiple: true, noClick: true, accept: {
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/gif': ['.gif'],
    } });

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