import { FC } from 'react';
import { DropzoneState } from 'react-dropzone';
import { FileDropzone } from './file-dropzone';

export type IFileDropzoneRootProps = {
    children: React.ReactNode;
    dropzoneProps: DropzoneState;
};
export const FileDropzoneRoot: FC<IFileDropzoneRootProps> = ({ children, dropzoneProps }) => {
    return (
        <div className="relative flex w-full flex-col items-start gap-0" {...dropzoneProps.getRootProps()}>
            {children}
            <FileDropzone dropzonProps={dropzoneProps} />
        </div>
    );
};