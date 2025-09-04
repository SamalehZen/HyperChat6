import { useChatStore } from '@repo/common/store';
import { useToast } from '@repo/ui';
import { ChangeEvent, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { nanoid } from 'nanoid';
import { ImageAttachmentData } from '@repo/shared/types';

// Type pour le retour du hook
interface UseImageAttachmentReturn {
    // Nouveau système multi-images
    imageAttachments: ImageAttachmentData[];
    handleMultipleImageUpload: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
    addMultipleFiles: (files: File[]) => Promise<void>;
    removeAttachment: (id: string) => void;
    clearAllAttachments: () => void;
    dropzonProps: any; // Simplified type to avoid issues
    
    // Ancien système (rétrocompatibilité)
    handleImageUpload: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
    readImageFile: (file?: File) => Promise<void>;
    clearAttachment: () => void;
    imageAttachment: { base64?: string; file?: File };
}
// const resizeFile = (file: File) =>
//   new Promise((resolve) => {
//     Resizer.imageFileResizer(
//       file,
//       1000,
//       1000,
//       "JPEG",
//       100,
//       0,
//       (uri) => {
//         resolve(uri);
//       },
//       "file",
//     );
//   });

export type TRenderImageUpload = {
    showIcon?: boolean;
    label?: string;
    tooltip?: string;
};

export const useImageAttachment = () => {
    // Ancien système (rétrocompatibilité)
    const imageAttachment = useChatStore(state => state.imageAttachment);
    const setImageAttachment = useChatStore(state => state.setImageAttachment);
    const clearImageAttachment = useChatStore(state => state.clearImageAttachment);
    
    // Nouveau système multi-images
    const imageAttachments = useChatStore(state => state.imageAttachments);
    const addImageAttachment = useChatStore(state => state.addImageAttachment);
    const removeImageAttachment = useChatStore(state => state.removeImageAttachment);
    const clearAllImageAttachments = useChatStore(state => state.clearAllImageAttachments);

    const { toast } = useToast();

    // Validation des fichiers
    const validateFile = (file: File): boolean => {
        const fileTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!fileTypes.includes(file.type)) {
            toast({
                title: 'Format invalide',
                description: 'Veuillez sélectionner une image valide (JPEG, PNG, GIF).',
                variant: 'destructive',
            });
            return false;
        }

        const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
        if (file.size > MAX_FILE_SIZE) {
            toast({
                title: 'Fichier trop volumineux',
                description: 'La taille de l\'image doit être inférieure à 3MB.',
                variant: 'destructive',
            });
            return false;
        }

        return true;
    };

    // Traitement d'un fichier en base64
    const processFile = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject(new Error('Erreur de lecture du fichier'));
                }
            };
            reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
            reader.readAsDataURL(file);
        });
    };

    // Ajouter plusieurs fichiers (nouveau système)
    const addMultipleFiles = useCallback(async (files: File[]) => {
        console.log('📤 addMultipleFiles appelé avec', files.length, 'fichiers');
        console.log('📊 Current imageAttachments count:', imageAttachments.length);
        
        const MAX_FILES = 10;
        const totalFiles = imageAttachments.length + files.length;
        
        if (totalFiles > MAX_FILES) {
            toast({
                title: 'Limite dépassée',
                description: `Maximum ${MAX_FILES} images autorisées. Vous avez ${imageAttachments.length} images et essayez d'en ajouter ${files.length}.`,
                variant: 'destructive',
            });
            return;
        }

        // Traiter tous les fichiers en parallèle
        const processedFiles: ImageAttachmentData[] = [];
        
        for (const file of files) {
            console.log('🔍 Traitement du fichier:', file.name, file.type, file.size);
            if (!validateFile(file)) {
                console.log('❌ Fichier invalide:', file.name);
                continue;
            }
            
            try {
                const base64 = await processFile(file);
                const imageData: ImageAttachmentData = {
                    id: nanoid(),
                    base64,
                    file,
                    name: file.name,
                    size: file.size,
                };
                processedFiles.push(imageData);
                console.log('✅ Fichier traité avec succès:', file.name, 'ID:', imageData.id);
            } catch (error) {
                console.error('❌ Erreur lors du traitement du fichier:', error);
                toast({
                    title: 'Erreur de traitement',
                    description: `Impossible de traiter le fichier ${file.name}`,
                    variant: 'destructive',
                });
            }
        }

        console.log('💾 Ajout de', processedFiles.length, 'images au store...');
        
        // Ajouter toutes les images traitées
        processedFiles.forEach((imageData, index) => {
            console.log(`📝 Ajout image ${index + 1}:`, imageData.name);
            addImageAttachment(imageData);
        });

        if (processedFiles.length > 0) {
            console.log('🎉 Succès! Images ajoutées:', processedFiles.length);
            toast({
                title: 'Images ajoutées',
                description: `${processedFiles.length} image(s) ajoutée(s) avec succès.`,
            });
        }
    }, [imageAttachments.length, addImageAttachment, toast]);

    // Dropzone pour multiple fichiers
    const onDrop = useCallback((acceptedFiles: File[]) => {
        console.log('🎯 onDrop appelé avec', acceptedFiles.length, 'fichiers:', acceptedFiles.map(f => f.name));
        addMultipleFiles(acceptedFiles);
    }, [addMultipleFiles]);

    const dropzonProps = useDropzone({ 
        onDrop, 
        multiple: true, 
        maxFiles: 10,
        accept: {
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/gif': ['.gif']
        },
        noClick: true 
    });

    // Input file multiple
    const handleMultipleImageUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            await addMultipleFiles(files);
        }
    }, [addMultipleFiles]);

    // Rétrocompatibilité - traitement d'un seul fichier
    const readImageFile = async (file?: File) => {
        if (!file || !validateFile(file)) return;

        try {
            const base64 = await processFile(file);
            const base64String = base64.split(',')[1];
            
            setImageAttachment({
                base64: `data:${file.type};base64,${base64String}`,
                file,
            });
        } catch (error) {
            console.error('Erreur lors de la lecture du fichier:', error);
            toast({
                title: 'Erreur',
                description: 'Impossible de lire le fichier image.',
                variant: 'destructive',
            });
        }
    };

    const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        await readImageFile(file);
    };

    const clearAttachment = () => {
        clearImageAttachment();
    };

    const clearAllAttachments = () => {
        clearAllImageAttachments();
    };

    const removeAttachment = (id: string) => {
        removeImageAttachment(id);
    };

    return {
        // Nouveau système multi-images (priorité)
        imageAttachments,
        handleMultipleImageUpload,
        addMultipleFiles,
        removeAttachment,
        clearAllAttachments,
        dropzonProps, // Dropzone configurée pour multiple
        
        // Ancien système (rétrocompatibilité)
        handleImageUpload,
        readImageFile,
        clearAttachment,
        imageAttachment,
    };
};
