import { Flex } from '@repo/ui';
import { IconPhotoPlus } from '../icons';
import { FC } from 'react';
import { DropzoneState } from 'react-dropzone';
import { useChatStore } from '@repo/common/store';

export type TFileDropzone = {
    dropzonProps: DropzoneState;
};
export const FileDropzone: FC<TFileDropzone> = ({ dropzonProps }) => {
    const count = useChatStore(state => state.fileAttachments?.length || 0);
    return (
        <>
            <input {...dropzonProps.getInputProps()} />
            {dropzonProps.isDragActive && (
                <Flex className="bg-secondary/90 absolute inset-0 z-10 overflow-hidden rounded-lg" items="center" justify="center" gap="sm">
                    <IconPhotoPlus size={16} className="text-muted-foreground" />
                    <p className="text-muted-foreground text-sm">Glissez-déposez des images ou PDF ici, ou cliquez pour sélectionner</p>
                </Flex>
            )}
            {count > 0 && (
                <div className="absolute bottom-2 right-2 z-10 rounded-md bg-black/70 px-2 py-1 text-xs text-white">{count} sélectionné(s)</div>
            )}
        </>
    );
};