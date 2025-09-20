import { useChatStore } from '@repo/common/store';
import { useToast } from '@repo/ui';
import { ChangeEvent, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

export type FileAttachment = { name: string; mimeType: string; base64: string };

const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
const IMAGE_MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
const PDF_MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILES = 30;
const MAX_PDF_PAGES = 20;

export const useFileAttachment = () => {
    const fileAttachments = useChatStore(state => state.fileAttachments as FileAttachment[] | undefined);
    const setFileAttachments = useChatStore(state => state.setFileAttachments as (files: FileAttachment[]) => void);
    const clearFileAttachments = useChatStore(state => state.clearFileAttachments as () => void);

    const { toast } = useToast();

    const readFileAsDataURL = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result !== 'string') return resolve('');
                resolve(reader.result);
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });

    const countPdfPages = async (file: File): Promise<number> => {
        const { getDocument } = await import('pdfjs-dist');
        const data = await file.arrayBuffer();
        const pdf = await (getDocument as any)({ data }).promise;
        const pages = pdf.numPages as number;
        try { await pdf.destroy?.(); } catch {}
        return pages;
    };

    const readFilesToAttachments = async (files: File[]): Promise<FileAttachment[]> => {
        const results: FileAttachment[] = [];

        for (const file of files) {
            if (!SUPPORTED_TYPES.includes(file.type)) {
                toast({
                    title: 'Format non supporté',
                    description: 'Formats acceptés: JPEG, PNG, GIF, PDF.',
                    variant: 'destructive',
                });
                continue;
            }

            if (file.type === 'application/pdf') {
                if (file.size > PDF_MAX_FILE_SIZE) {
                    toast({
                        title: 'PDF trop volumineux',
                        description: 'Poids maximum par PDF: 20MB.',
                        variant: 'destructive',
                    });
                    continue;
                }
                try {
                    const pages = await countPdfPages(file);
                    if (pages > MAX_PDF_PAGES) {
                        toast({
                            title: 'PDF trop long',
                            description: `PDF limité à 20 pages (fichier: ${file.name}).`,
                            variant: 'destructive',
                        });
                        continue;
                    }
                } catch (e) {
                    toast({ title: 'Erreur PDF', description: `Impossible de lire ${file.name}.`, variant: 'destructive' });
                    continue;
                }
            } else {
                if (file.size > IMAGE_MAX_FILE_SIZE) {
                    toast({
                        title: 'Image trop volumineuse',
                        description: 'Taille maximale par image: 3MB.',
                        variant: 'destructive',
                    });
                    continue;
                }
            }

            const base64 = await readFileAsDataURL(file);
            results.push({ name: file.name, mimeType: file.type, base64 });
        }

        return results;
    };

    const addFiles = async (files: File[]) => {
        if (!files?.length) return;
        const current = fileAttachments || [];
        const availableSlots = Math.max(0, MAX_FILES - current.length);
        if (availableSlots <= 0) {
            toast({ title: 'Limite atteinte', description: `Maximum ${MAX_FILES} fichiers par message.`, variant: 'destructive' });
            return;
        }

        const filesToProcess = files.slice(0, availableSlots);
        if (files.length > availableSlots) {
            toast({ title: 'Certains fichiers ignorés', description: `Seulement ${availableSlots} fichier(s) peuvent être ajoutés (max ${MAX_FILES}).`, variant: 'destructive' });
        }

        const newAttachments = await readFilesToAttachments(filesToProcess);
        if (newAttachments.length) {
            setFileAttachments([...(current || []), ...newAttachments]);
        }
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        addFiles(acceptedFiles);
    }, [fileAttachments]);

    const dropzonProps = useDropzone({
        onDrop,
        multiple: true,
        noClick: true,
        accept: {
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/gif': ['.gif'],
            'application/pdf': ['.pdf'],
        },
    });

    const clearAttachment = () => {
        clearFileAttachments();
    };

    const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        await addFiles(files);
        e.target.value = '';
    };

    return {
        dropzonProps,
        handleFileUpload,
        clearAttachment,
    };
};