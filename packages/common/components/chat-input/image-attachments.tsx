'use client';

import { useImageAttachment } from '@repo/common/hooks';
import { ImageAttachmentData } from '@repo/shared/types';
import { Button } from '@repo/ui';
import { X, FileImage } from 'lucide-react';
import { memo } from 'react';

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface ImageAttachmentItemProps {
    attachment: ImageAttachmentData;
    onRemove: (id: string) => void;
}

const ImageAttachmentItem = memo(({ attachment, onRemove }: ImageAttachmentItemProps) => {
    return (
        <div className="relative group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            {/* Image Preview */}
            <div className="aspect-square w-20 h-20 overflow-hidden bg-gray-100 dark:bg-gray-700">
                {attachment.base64 ? (
                    <img
                        src={attachment.base64}
                        alt={attachment.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <FileImage className="w-8 h-8 text-gray-400" />
                    </div>
                )}
            </div>
            
            {/* File Info */}
            <div className="p-2 space-y-1">
                <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate" title={attachment.name}>
                    {attachment.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(attachment.size)}
                </div>
            </div>
            
            {/* Remove Button */}
            <Button
                size="icon"
                variant="ghost"
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onRemove(attachment.id)}
            >
                <X className="w-3 h-3" />
            </Button>
        </div>
    );
});

ImageAttachmentItem.displayName = 'ImageAttachmentItem';

export const ImageAttachments = memo(() => {
    const { imageAttachments, removeAttachment, clearAllAttachments } = useImageAttachment();

    console.log('🎨 ImageAttachments rendu avec', imageAttachments.length, 'images');

    if (imageAttachments.length === 0) {
        console.log('🎨 ImageAttachments: Aucune image, pas d\'affichage');
        return null;
    }

    return (
        <div className="w-full space-y-3">
            {/* Header avec compteur et bouton clear */}
            <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Images attachées ({imageAttachments.length})
                </div>
                {imageAttachments.length > 1 && (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={clearAllAttachments}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                        Tout supprimer
                    </Button>
                )}
            </div>
            
            {/* Grille d'images */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {imageAttachments.map((attachment) => (
                    <ImageAttachmentItem
                        key={attachment.id}
                        attachment={attachment}
                        onRemove={removeAttachment}
                    />
                ))}
            </div>
            
            {/* Info supplémentaire */}
            {imageAttachments.length >= 8 && (
                <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
                    ⚠️ Limite de 10 images. Encore {10 - imageAttachments.length} image(s) possible(s).
                </div>
            )}
        </div>
    );
});

ImageAttachments.displayName = 'ImageAttachments';