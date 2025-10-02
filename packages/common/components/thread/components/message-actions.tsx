'use client';
import { ChatModeOptions } from '@repo/common/components';
import { useAgentStream, useCopyText } from '@repo/common/hooks';
import { useChatStore } from '@repo/common/store';
import { ChatMode, getChatModeName } from '@repo/shared/config';
import { ThreadItem } from '@repo/shared/types';
import { Button, DropdownMenu, DropdownMenuTrigger } from '@repo/ui';
import { IconCheck, IconCopy, IconMarkdown, IconRefresh, IconTrash, IconFileSpreadsheet } from '@tabler/icons-react';
import { forwardRef, useMemo, useState } from 'react';
type MessageActionsProps = {
    threadItem: ThreadItem;
    isLast: boolean;
};

export const MessageActions = forwardRef<HTMLDivElement, MessageActionsProps>(
    ({ threadItem, isLast }, ref) => {
        const { handleSubmit } = useAgentStream();
        const removeThreadItem = useChatStore(state => state.deleteThreadItem);
        const getThreadItems = useChatStore(state => state.getThreadItems);
        const useWebSearch = useChatStore(state => state.useWebSearch);
        const [chatMode, setChatMode] = useState<ChatMode>(threadItem.mode);
        const { copyToClipboard, status, copyMarkdown, markdownCopyStatus } = useCopyText();
        const canDownloadXLSX = useMemo(() => {
            if (threadItem.mode !== ChatMode.CREATION_D_ARTICLE) return false;
            const text = threadItem?.answer?.text || '';
            const lines = text.split('\n');
            const tableStart = lines.findIndex(l => l.trim().startsWith('|'));
            if (tableStart === -1) return false;
            const tableLines = [] as string[];
            for (let i = tableStart; i < lines.length; i++) {
                if (lines[i].trim().startsWith('|')) tableLines.push(lines[i]); else break;
            }
            return tableLines.length >= 3;
        }, [threadItem.mode, threadItem?.answer?.text]);

        const handleDownloadXLSX = async () => {
            try {
                const XLSX = await import('xlsx');
                const text = threadItem?.answer?.text || '';
                const lines = text.split('\n');
                const tableStart = lines.findIndex(l => l.trim().startsWith('|'));
                if (tableStart === -1) return;
                const tableLines: string[][] = [];
                for (let i = tableStart; i < lines.length; i++) {
                    if (!lines[i].trim().startsWith('|')) break;
                    const row = lines[i].split('|').slice(1, -1).map(c => c.trim());
                    tableLines.push(row);
                }
                if (tableLines.length === 0) return;
                const ws = XLSX.utils.aoa_to_sheet(tableLines);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Articles');
                const filename = `creation-article-${threadItem.id}.xlsx`;
                XLSX.writeFile(wb, filename);
            } catch (e) {
                console.error('XLSX export failed', e);
            }
        };

        return (
            <div className="flex flex-row items-center gap-1 py-2">
                {threadItem?.answer?.text && (
                    <Button
                        variant="ghost-bordered"
                        size="icon-sm"
                        onClick={() => {
                            if (ref && 'current' in ref && ref.current && typeof ref.current !== 'string') {
                                copyToClipboard(ref.current);
                            }
                        }}
                        tooltip="Copy"
                    >
                        {status === 'copied' ? (
                            <IconCheck size={16} strokeWidth={2} />
                        ) : (
                            <IconCopy size={16} strokeWidth={2} />
                        )}
                    </Button>
                )}

                {threadItem?.answer?.text && (
                    <Button
                        variant="ghost-bordered"
                        size="icon-sm"
                        onClick={() => {
                            copyMarkdown(
                                `${threadItem?.answer?.text}\n\n## References\n${threadItem?.sources
                                    ?.map(source => `[${source.index}] ${source.link}`)
                                    .join('\n')}`
                            );
                        }}
                        tooltip="Copy Markdown"
                    >
                        {markdownCopyStatus === 'copied' ? (
                            <IconCheck size={16} strokeWidth={2} />
                        ) : (
                            <IconMarkdown size={16} strokeWidth={2} />
                        )}
                    </Button>
                )}
                {threadItem.status !== 'ERROR' && threadItem.answer?.status !== 'HUMAN_REVIEW' && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost-bordered" size="icon-sm" tooltip="Rewrite">
                                <IconRefresh size={16} strokeWidth={2} />
                            </Button>
                        </DropdownMenuTrigger>
                        <ChatModeOptions
                            chatMode={chatMode}
                            setChatMode={async mode => {
                                setChatMode(mode);
                                const formData = new FormData();
                                formData.append('query', threadItem.query || '');
                                const threadItems = await getThreadItems(threadItem.threadId);
                                handleSubmit({
                                    formData,
                                    existingThreadItemId: threadItem.id,
                                    newChatMode: mode as any,
                                    messages: threadItems,
                                    useWebSearch: useWebSearch,
                                });
                            }}
                        />
                    </DropdownMenu>
                )}

                {isLast && (
                    <>
                        <Button
                            variant="ghost-bordered"
                            size="icon-sm"
                            onClick={() => {
                                removeThreadItem(threadItem.id);
                            }}
                            tooltip="Remove"
                        >
                            <IconTrash size={16} strokeWidth={2} />
                        </Button>
                        {canDownloadXLSX && (
                            <Button
                                variant="ghost-bordered"
                                size="icon-sm"
                                onClick={handleDownloadXLSX}
                                tooltip="Télécharger XLSX"
                            >
                                <IconFileSpreadsheet size={16} strokeWidth={2} />
                            </Button>
                        )}
                    </>
                )}
                {threadItem.mode && (
                    <p className="text-muted-foreground px-2 text-xs">
                        Généré avec {getChatModeName(threadItem.mode)}
                    </p>
                )}
            </div>
        );
    }
);

MessageActions.displayName = 'MessageActions';
