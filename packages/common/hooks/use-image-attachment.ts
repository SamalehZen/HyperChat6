import { useChatStore } from '@repo/common/store';
import { useToast } from '@repo/ui';
import { ChangeEvent, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { nanoid } from 'nanoid';
import { FileAttachmentData } from '@repo/shared/types';

export type TRenderFileUpload = {
    showIcon?: boolean;
    label?: string;
    tooltip?: string;
};

// Backward compatibility
export type TRenderImageUpload = TRenderFileUpload;

export const useFileAttachment = () => {
    const fileAttachments = useChatStore(state => state.fileAttachments);
    const addFileAttachment = useChatStore(state => state.addFileAttachment);
    const removeFileAttachment = useChatStore(state => state.removeFileAttachment);
    const clearFileAttachments = useChatStore(state => state.clearFileAttachments);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        acceptedFiles.forEach(file => readFileAttachment(file));
    }, []);
    
    const dropzonProps = useDropzone({ 
        onDrop, 
        multiple: true, 
        noClick: true,
        accept: {
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/gif': ['.gif'],
            'application/pdf': ['.pdf']
        }
    });
    
    const { toast } = useToast();

    const clearAttachments = () => {
        clearFileAttachments();
    };

    const removeAttachment = (id: string) => {
        removeFileAttachment(id);
    };

    const readFileAttachment = async (file?: File) => {
        if (!file) return;

        const fileTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        if (!fileTypes.includes(file.type)) {
            toast({
                title: 'Invalid format',
                description: 'Please select a valid file (JPEG, PNG, GIF, PDF).',
                variant: 'destructive',
            });
            return;
        }

        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes (increased for PDF support)
        if (file.size > MAX_FILE_SIZE) {
            toast({
                title: 'File too large',
                description: 'File size should be less than 10MB.',
                variant: 'destructive',
            });
            return;
        }

        // Check if file already exists
        const existingFile = fileAttachments.find(f => f.name === file.name && f.size === file.size);
        if (existingFile) {
            toast({
                title: 'File already attached',
                description: `${file.name} is already in your attachments.`,
                variant: 'destructive',
            });
            return;
        }

        const reader = new FileReader();
        const fileId = nanoid();

        reader.onload = () => {
            if (typeof reader.result !== 'string') return;
            const base64String = reader.result;
            
            addFileAttachment({
                id: fileId,
                base64: base64String,
                file,
                name: file.name,
                type: file.type,
                size: file.size,
            });
        };

        reader.readAsDataURL(file);
    };

    const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        files.forEach(file => readFileAttachment(file));
        // Reset the input so the same file can be selected again
        e.target.value = '';
    };

    return {
        dropzonProps,
        handleFileUpload,
        clearAttachments,
        removeAttachment,
        fileAttachments,
        readFileAttachment, // Export this for the wrapper
    };
};

// Backward compatibility wrapper
export const useImageAttachment = () => {
    const result = useFileAttachment();
    return {
        dropzonProps: result.dropzonProps,
        handleImageUpload: result.handleFileUpload,
        handleMultipleImageUpload: result.handleFileUpload, // Same handler for multiple files
        clearAttachment: result.clearAttachments,
        clearAllAttachments: result.clearAttachments,
        imageAttachments: result.fileAttachments, // Map fileAttachments to imageAttachments
        removeAttachment: result.removeAttachment,
        addMultipleFiles: async (files: File[]) => {
            files.forEach(file => result.readFileAttachment(file));
        },
        readImageFile: result.readFileAttachment, // Export for animated-input.tsx compatibility
        imageAttachment: { base64: undefined, file: undefined }, // Legacy single attachment
    };
};