'use client';
import { useAuth } from '@clerk/nextjs';
import {
    ImageAttachment,
    ImageDropzoneRoot,
    MessagesRemainingBadge,
} from '@repo/common/components';
import { useImageAttachment } from '@repo/common/hooks';
import { ChatModeConfig, ChatMode } from '@repo/shared/config';
import { cn, Flex, GridGradientBackground } from '@repo/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { useParams, usePathname, useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { useI18n } from '@repo/common/i18n';
import { usePreferencesStore } from '@repo/common/store';
import { v4 as uuidv4 } from 'uuid';
import { useShallow } from 'zustand/react/shallow';
import { useAgentStream } from '../../hooks/agent-provider';
import { useChatEditor } from '../../hooks/use-editor';
import { useChatStore } from '../../store';
import { ExamplePrompts } from '../exmaple-prompts';
import { ChatModeButton, GeneratingStatus, SendStopButton, WebSearchButton } from './chat-actions';
import { ChatEditor } from './chat-editor';
import { ImageUpload } from './image-upload';

export const ChatInput = ({
    showGreeting = true,
    showBottomBar = true,
    isFollowUp = false,
}: {
    showGreeting?: boolean;
    showBottomBar?: boolean;
    isFollowUp?: boolean;
}) => {
    const { isSignedIn } = useAuth();
    const { t } = useI18n();

    const { threadId: currentThreadId } = useParams();
    const { editor } = useChatEditor({
        placeholder: isFollowUp ? t('chat.input.placeholderFollowUp') : t('chat.input.placeholder'),
        onInit: ({ editor }) => {
            if (typeof window !== 'undefined' && !isFollowUp && !isSignedIn) {
                const draftMessage = window.localStorage.getItem('draft-message');
                if (draftMessage) {
                    editor.commands.setContent(draftMessage, true, { preserveWhitespace: true });
                }
            }
        },
        onUpdate: ({ editor }) => {
            if (typeof window !== 'undefined' && !isFollowUp) {
                window.localStorage.setItem('draft-message', editor.getText());
            }
        },
    });
    const size = currentThreadId ? 'base' : 'sm';
    const backgroundVariant = usePreferencesStore(state => state.backgroundVariant);
    const getThreadItems = useChatStore(state => state.getThreadItems);
    const threadItemsLength = useChatStore(useShallow(state => state.threadItems.length));
    const { handleSubmit } = useAgentStream();
    const createThread = useChatStore(state => state.createThread);
    const useWebSearch = useChatStore(state => state.useWebSearch);
    const isGenerating = useChatStore(state => state.isGenerating);
    const isChatPage = usePathname().startsWith('/chat');
    const imageAttachments = useChatStore(state => state.imageAttachments);
    const clearImageAttachments = useChatStore(state => state.clearImageAttachments);
    const stopGeneration = useChatStore(state => state.stopGeneration);
    const hasTextInput = !!editor?.getText();
    const { dropzonProps, handleImageUpload } = useImageAttachment();
    const { push } = useRouter();
    const chatMode = useChatStore(state => state.chatMode);
    const showSuggestions = useChatStore(state => state.showSuggestions);
    const setShowSuggestions = useChatStore(state => state.setShowSuggestions);
    const sendMessage = async () => {
        if (
            !isSignedIn &&
            !!ChatModeConfig[chatMode as keyof typeof ChatModeConfig]?.isAuthRequired
        ) {
            push('/sign-in');
            return;
        }

        if (!editor?.getText()) {
            return;
        }

        let threadId = currentThreadId?.toString();

        if (!threadId) {
            const optimisticId = uuidv4();
            push(`/chat/${optimisticId}`);
            createThread(optimisticId, {
                title: editor?.getText(),
            });
            threadId = optimisticId;
        }

        const originalQuery = editor.getText();
        const allowPdf = chatMode === ChatMode.GEMINI_2_5_FLASH || chatMode === ChatMode.SMART_PDF_TO_EXCEL;
        const images = (imageAttachments || []).filter(att => (att.base64 || '').startsWith('data:image/'));
        const pdfs = allowPdf ? (imageAttachments || []).filter(att => att.file?.type === 'application/pdf') : [];

        let finalQuery = originalQuery;
        if (allowPdf && pdfs.length > 0) {
            try {
                const fd = new FormData();
                pdfs.forEach(att => {
                    if (att.file) fd.append('file', att.file);
                });
                const controller = new AbortController();
                const t = setTimeout(() => controller.abort(), 15000);
                const res = await fetch('/api/pdf/extract', { method: 'POST', body: fd, signal: controller.signal });
                clearTimeout(t);
                if (res.ok) {
                    const data = await res.json();
                    if (data?.combinedText) {
                        finalQuery = `${originalQuery}\n\n[Pièce jointe PDF]\n${data.combinedText}`.trim();
                    }
                } else {
                    try {
                        // Fallback to client extraction
                        // @ts-ignore
                        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
                        const extractPdfText = async (file: File) => {
                            const data = new Uint8Array(await file.arrayBuffer());
                            // @ts-ignore
                            const doc = await pdfjsLib.getDocument({ data }).promise;
                            let fullText = '';
                            for (let p = 1; p <= doc.numPages; p++) {
                                const page = await doc.getPage(p);
                                const textContent = await page.getTextContent();
                                const pageText = textContent.items.map((it: any) => it.str).join(' ');
                                fullText += (p > 1 ? '\n\n' : '') + pageText;
                            }
                            return fullText.trim();
                        };
                        const texts = await Promise.all(pdfs.map(p => p.file ? extractPdfText(p.file) : Promise.resolve('')));
                        const combined = texts.filter(Boolean).join('\n\n');
                        if (combined) {
                            finalQuery = `${originalQuery}\n\n[Pièce jointe PDF]\n${combined}`.trim();
                        }
                    } catch {}
                }
            } catch {}
        }

        const formData = new FormData();
        formData.append('query', finalQuery);
        if (images && images.length > 0) {
            images.forEach((img, index) => {
                if (img.base64) {
                    formData.append(`imageAttachment_${index}`, img.base64);
                }
            });
            formData.append('imageAttachmentCount', images.length.toString());
        } else {
            formData.append('imageAttachmentCount', '0');
        }
        const threadItems = currentThreadId ? await getThreadItems(currentThreadId.toString()) : [];

        handleSubmit({
            formData,
            newThreadId: threadId,
            messages: threadItems.sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            ),
            useWebSearch,
        });
        window.localStorage.removeItem('draft-message');
        editor.commands.clearContent();
        clearImageAttachments();
        setShowSuggestions(false);
    };

    const renderChatInput = () => (
        <AnimatePresence>
            <motion.div
                className="w-full px-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={`chat-input`}
                transition={{ duration: 0.2, ease: 'easeOut' }}
            >
                <Flex
                    direction="col"
                    className={cn(
                        'bg-background border-hard/50 shadow-subtle-sm relative z-10 w-full rounded-xl border'
                    )}
                >
                    <ImageDropzoneRoot dropzoneProps={dropzonProps}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.15 }}
                            className="flex w-full flex-shrink-0 overflow-hidden rounded-lg"
                        >
                            {editor?.isEditable ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.15, ease: 'easeOut' }}
                                    className="w-full"
                                >
                                    <ImageAttachment />
                                    <Flex className="flex w-full flex-row items-end gap-0">
                                        <ChatEditor
                                            sendMessage={sendMessage}
                                            editor={editor}
                                            className="px-3 pt-3"
                                        />
                                    </Flex>
                                    <AnimatePresence initial={false}>
                                        {chatMode === ChatMode.GEMINI_2_5_FLASH && showSuggestions && (
                                            <motion.div
                                                key="example-prompts"
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 8 }}
                                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                                className="mt-2 relative z-10 pointer-events-auto"
                                            >
                                                <ExamplePrompts />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <Flex
                                        className="border-border w-full gap-0 border-t border-dashed px-2 py-2"
                                        gap="none"
                                        items="center"
                                        justify="between"
                                    >
                                        {isGenerating && !isChatPage ? (
                                            <GeneratingStatus />
                                        ) : (
                                            <Flex gap="xs" items="center" className="shrink-0">
                                                <ChatModeButton />
                                                {/* <AttachmentButton /> */}
                                                <WebSearchButton />
                                                {/* <ToolsMenu /> */}
                                                <ImageUpload
                                                    id="image-attachment"
                                                    label="Images"
                                                    tooltip="Attach images"
                                                    showIcon={true}
                                                    handleImageUpload={handleImageUpload}
                                                />
                                            </Flex>
                                        )}

                                        <Flex gap="md" items="center">
                                            <SendStopButton
                                                isGenerating={isGenerating}
                                                isChatPage={isChatPage}
                                                stopGeneration={stopGeneration}
                                                hasTextInput={hasTextInput}
                                                sendMessage={sendMessage}
                                            />
                                        </Flex>
                                    </Flex>
                                </motion.div>
                            ) : (
                                <motion.div
                                    className="flex h-24 w-full items-center justify-center"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    <div className="animate-pulse" role="status" aria-live="polite">Loading editor...</div>
                                </motion.div>
                            )}
                        </motion.div>
                    </ImageDropzoneRoot>
                </Flex>
            </motion.div>
            <MessagesRemainingBadge key="remaining-messages" />
        </AnimatePresence>
    );

    const renderChatBottom = () => (
        <>
            <Flex items="center" justify="center" gap="sm">
                {/* <ScrollToBottomButton /> */}
            </Flex>
            {renderChatInput()}
        </>
    );

    useEffect(() => {
        editor?.commands.focus('end');
    }, [currentThreadId]);

    return (
        <div
            className={cn(
                'bg-secondary w-full',
                currentThreadId
                    ? 'absolute bottom-0'
                    : 'absolute inset-0 flex h-full w-full flex-col items-center justify-center'
            )}
        >
            {!currentThreadId && <GridGradientBackground side="left" variant={backgroundVariant} />}
            <div
                className={cn(
                    'mx-auto flex w-full max-w-3xl flex-col items-start',
                    !threadItemsLength && 'justify-start',
                    size === 'sm' && 'px-8'
                )}
            >
                <Flex
                    items="start"
                    justify="start"
                    direction="col"
                    className={cn('w-full pb-4', threadItemsLength > 0 ? 'mb-0' : 'h-full')}
                >
                    {!currentThreadId && showGreeting && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className="mb-4 flex w-full flex-col items-center gap-1"
                        >
                            <AnimatedTitles />
                        </motion.div>
                    )}

                    {renderChatBottom()}
                    {!currentThreadId && false}

                    {/* <ChatFooter /> */}
                </Flex>
            </div>
        </div>
    );
};

type AnimatedTitlesProps = {
    titles?: string[];
};

const AnimatedTitles = ({ titles = [] }: AnimatedTitlesProps) => {
    const { t } = useI18n();
    const [greeting, setGreeting] = React.useState<string>('');

    React.useEffect(() => {
        const getTimeBasedGreeting = () => {
            const hour = new Date().getHours();

            if (hour >= 5 && hour < 12) {
                return t('chat.greeting.morning');
            } else if (hour >= 12 && hour < 18) {
                return t('chat.greeting.afternoon');
            } else {
                return t('chat.greeting.evening');
            }
        };

        setGreeting(getTimeBasedGreeting());

        // Update the greeting if the component is mounted during a time transition
        const interval = setInterval(() => {
            const newGreeting = getTimeBasedGreeting();
            if (newGreeting !== greeting) {
                setGreeting(newGreeting);
            }
        }, 60000); // Check every minute

        return () => clearInterval(interval);
    }, [greeting]);

    return (
        <Flex
            direction="col"
            className="relative h-[60px] w-full items-center justify-center overflow-hidden"
        >
            <AnimatePresence mode="wait">
                <motion.h1
                    key={greeting}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{
                        duration: 0.8,
                        ease: 'easeInOut',
                    }}
                    className="from-muted-foreground/50 via-muted-foreground/40 to-muted-foreground/20 bg-gradient-to-r bg-clip-text text-center text-[32px] font-semibold tracking-tight text-transparent"
                >
                    {greeting}
                </motion.h1>
            </AnimatePresence>
        </Flex>
    );
};
