import { useChatStore } from '@repo/common/store';
import { cn, Flex } from '@repo/ui';
import type { Editor as TiptapEditor } from '@tiptap/react';
import dynamic from 'next/dynamic';
import { FC } from 'react';

const EditorContentDynamic = dynamic(async () => (await import('@tiptap/react')).EditorContent, {
    ssr: false,
});

export type TChatEditor = {
    sendMessage?: (message: string) => void;
    editor: TiptapEditor | null;
    maxHeight?: string;
    className?: string;
    placeholder?: string;
};

export const ChatEditor: FC<TChatEditor> = ({
    sendMessage,
    editor,
    placeholder,
    maxHeight = '200px',
    className,
}) => {
    const isGenerating = useChatStore(state => state.isGenerating);

    const editorContainerClass =
        'no-scrollbar [&>*]:no-scrollbar wysiwyg min-h-[60px] w-full cursor-text overflow-y-auto p-1 text-base outline-none focus:outline-none [&>*]:leading-6 [&>*]:outline-none [&>*]:break-all [&>*]:word-break-break-word [&>*]:whitespace-pre-wrap';

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (isGenerating) return;
        if (e.key === 'Enter' && !e.shiftKey && editor) {
            sendMessage?.(editor.getText());
        }
        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            e.currentTarget.scrollTop = e.currentTarget.scrollHeight;
        }
    };

    if (!editor) {
        return (
            <Flex className="flex-1">
                <textarea
                    aria-label={placeholder || 'Editor'}
                    placeholder={placeholder}
                    disabled={isGenerating}
                    className={cn(
                        'min-h-[60px] w-full resize-none rounded-md border bg-transparent p-2 text-base outline-none focus:outline-none',
                        className
                    )}
                    style={{ maxHeight }}
                />
            </Flex>
        );
    }

    return (
        <Flex className="flex-1">
            <EditorContentDynamic
                editor={editor}
                autoFocus
                style={{ maxHeight }}
                disabled={isGenerating}
                onKeyDown={handleKeyDown}
                className={cn(editorContainerClass, className)}
            />
        </Flex>
    );
};
