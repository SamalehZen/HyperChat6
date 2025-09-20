import { Flex } from '@repo/ui';
import { IconPhotoPlus } from '../icons';
import { FC, useMemo } from 'react';
import { DropzoneState } from 'react-dropzone';
import { useChatStore } from '@repo/common/store';
import { ChatMode } from '@repo/shared/config';

export type TImageDropzone = {
    dropzonProps: DropzoneState;
};
export const ImageDropzone: FC<TImageDropzone> = ({ dropzonProps }) => {
    const count = useChatStore(state => state.imageAttachments?.length || 0);
    const chatMode = useChatStore(state => state.chatMode);
    const helperText = useMemo(() => {
        return chatMode === ChatMode.SMART_PDF_TO_EXCEL
            ? 'Drag and drop images or PDFs here, or click to select'
            : 'Drag and drop images here, or click to select images';
    }, [chatMode]);
    return (
        <>
            <input {...dropzonProps.getInputProps()} />
            {dropzonProps.isDragActive && (
                <Flex
                    className="bg-secondary/90 absolute inset-0 z-10 overflow-hidden rounded-lg"
                    items="center"
                    justify="center"
                    gap="sm"
                >
                    <IconPhotoPlus size={16} className="text-muted-foreground" />
                    <p className="text-muted-foreground text-sm">{helperText}</p>
                </Flex>
            )}
            {count > 0 && (
                <div className="absolute bottom-2 right-2 z-10 rounded-md bg-black/70 px-2 py-1 text-xs text-white">
                    {count} selected
                </div>
            )}
        </>
    );
};