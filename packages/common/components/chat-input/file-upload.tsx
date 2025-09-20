import { useChatStore } from '@repo/common/store';
import { ChatModeConfig } from '@repo/shared/config';
import { Button, Tooltip } from '@repo/ui';
import { IconPaperclip } from '../icons';
import { FC } from 'react';

export type TFileUpload = {
    id: string;
    label: string;
    tooltip: string;
    showIcon: boolean;
    handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export const FileUpload: FC<TFileUpload> = ({ id, label, tooltip, showIcon, handleFileUpload }) => {
    const chatMode = useChatStore(state => state.chatMode);
    const handleFileSelect = () => {
        document.getElementById(id)?.click();
    };

    if (!ChatModeConfig[chatMode]?.imageUpload) {
        return null;
    }

    return (
        <>
            <input type="file" id={id} className="hidden" onChange={handleFileUpload} multiple accept="image/jpeg,image/png,image/gif,application/pdf" />
            <Tooltip content={tooltip}>
                {showIcon ? (
                    <Button variant="ghost" size="icon-sm" onClick={handleFileSelect}>
                        <IconPaperclip size={16} strokeWidth={2} />
                    </Button>
                ) : (
                    <Button variant="bordered" onClick={handleFileSelect}>
                        {label}
                    </Button>
                )}
            </Tooltip>
        </>
    );
};