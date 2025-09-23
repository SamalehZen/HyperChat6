'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import {
    ImageAttachment,
    ImageDropzoneRoot,
    MessagesRemainingBadge,
} from '@repo/common/components';
import { useImageAttachment } from '@repo/common/hooks';
import { CHAT_MODE_CREDIT_COSTS, ChatMode, ChatModeConfig, getChatModeName, getShineColors } from '@repo/shared/config';
import { cn, Flex, AI_Prompt, ModelIcons, useToast, GridGradientBackground } from '@repo/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { useParams, usePathname, useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useShallow } from 'zustand/react/shallow';
import { useAgentStream } from '../../hooks/agent-provider';
import { useApiKeysStore, useChatStore } from '../../store';
import { ExamplePrompts } from '../exmaple-prompts';
import { usePreferencesStore } from '@repo/common/store';
import { NewIcon, ComingSoonIcon } from '../icons';
import {
    IconAtom,
    IconNorthStar,
    IconCheck,
    IconTable,
    IconCurrencyEuro,
} from '@tabler/icons-react';
import { NomenclatureDouaniereIcon } from '../icons';

export const AnimatedChatInput = ({
    showGreeting = true,
    showBottomBar = true,
    isFollowUp = false,
}: {
    showGreeting?: boolean;
    showBottomBar?: boolean;
    isFollowUp?: boolean;
}) => {
    const { isSignedIn } = useAuth();
    const { user } = useUser();
    const { threadId: currentThreadId } = useParams();
    const backgroundVariant = usePreferencesStore(state => state.backgroundVariant);
    const unicornProjectId = usePreferencesStore(state => state.unicornProjectId);
    const aiPromptShinePreset = usePreferencesStore(state => state.aiPromptShinePreset);
    const getThreadItems = useChatStore(state => state.getThreadItems);
    const threadItemsLength = useChatStore(useShallow(state => state.threadItems.length));
    const { handleSubmit } = useAgentStream();
    const createThread = useChatStore(state => state.createThread);
    const useWebSearch = useChatStore(state => state.useWebSearch);
    const setUseWebSearch = useChatStore(state => state.setUseWebSearch);
    const isGenerating = useChatStore(state => state.isGenerating);
    const isChatPage = usePathname().startsWith('/chat');
    const imageAttachments = useChatStore(state => state.imageAttachments);
    const clearImageAttachments = useChatStore(state => state.clearImageAttachments);

    const { toast } = useToast();

    const stopGeneration = useChatStore(state => state.stopGeneration);
    const { dropzonProps, readImageFile } = useImageAttachment();
    const [showExtractionPrompt, setShowExtractionPrompt] = React.useState(false);
    const extractionLabel = 'Toutes les tables';
    const { push } = useRouter();
    const chatMode = useChatStore(state => state.chatMode);
    const setChatMode = useChatStore(state => state.setChatMode);
    const creditLimit = useChatStore(state => state.creditLimit);
    const inputValue = useChatStore(state => state.inputValue);
    const setInputValue = useChatStore(state => state.setInputValue);
    const hasApiKeyForChatMode = useApiKeysStore(state => state.hasApiKeyForChatMode);
    const showSuggestions = useChatStore(state => state.showSuggestions);
    const setShowSuggestions = useChatStore(state => state.setShowSuggestions);

    useEffect(() => {
        if (!currentThreadId && chatMode === ChatMode.GEMINI_2_5_FLASH) {
            setShowSuggestions(true);
        }
    }, [currentThreadId, chatMode, setShowSuggestions]);

    // Load draft message from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined' && !isFollowUp && !isSignedIn) {
            const draftMessage = window.localStorage.getItem('draft-message');
            if (draftMessage) {
                setInputValue(draftMessage);
            }
        }
    }, [isFollowUp, isSignedIn]);

    // Save draft message to localStorage
    useEffect(() => {
        if (typeof window !== 'undefined' && !isFollowUp) {
            window.localStorage.setItem('draft-message', inputValue);
        }
    }, [inputValue, isFollowUp]);

    // Define all AI models with their icons and metadata
    const AI_MODELS = [
        // Advanced Modes
        {
            id: ChatMode.Deep,
            name: 'Recherche Approfondie',
            icon: <IconAtom size={16} className="text-muted-foreground" strokeWidth={2} />,
            creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.Deep],
            isAuthRequired: ChatModeConfig[ChatMode.Deep].isAuthRequired,
            category: 'advanced',
        },
        {
            id: ChatMode.Pro,
            name: 'Recherche Pro',
            icon: <IconNorthStar size={16} className="text-muted-foreground" strokeWidth={2} />,
            creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.Pro],
            isAuthRequired: ChatModeConfig[ChatMode.Pro].isAuthRequired,
            category: 'advanced',
        },
        {
            id: ChatMode.CORRECTION,
            name: 'Correction',
            icon: <IconCheck size={16} className="text-muted-foreground" strokeWidth={2} />,
            creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.CORRECTION],
            isAuthRequired: ChatModeConfig[ChatMode.CORRECTION].isAuthRequired,
            category: 'advanced',
        },
        {
            id: ChatMode.CLASSIFICATION,
            name: 'Classification Structure',
            icon: <IconTable size={16} className="text-muted-foreground" strokeWidth={2} />,
            creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.CLASSIFICATION],
            isAuthRequired: ChatModeConfig[ChatMode.CLASSIFICATION].isAuthRequired,
            category: 'advanced',
        },
        {
            id: ChatMode.REVISION_DE_PRIX,
            name: 'Révision de Prix',
            icon: <IconCurrencyEuro size={16} className="text-muted-foreground" strokeWidth={2} />,
            creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.REVISION_DE_PRIX],
            isAuthRequired: ChatModeConfig[ChatMode.REVISION_DE_PRIX].isAuthRequired,
            isNew: ChatModeConfig[ChatMode.REVISION_DE_PRIX].isNew,
            category: 'advanced',
        },
        {
            id: ChatMode.NOMENCLATURE_DOUANIERE,
            name: 'Nomenclature Douanière',
            icon: <NomenclatureDouaniereIcon />,
            creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.NOMENCLATURE_DOUANIERE],
            isAuthRequired: ChatModeConfig[ChatMode.NOMENCLATURE_DOUANIERE].isAuthRequired,
            isNew: ChatModeConfig[ChatMode.NOMENCLATURE_DOUANIERE].isNew,
            category: 'advanced',
        },
        {
            id: ChatMode.SMART_PDF_TO_EXCEL,
            name: 'Smart Image to Excel',
            icon: <IconTable size={16} className="text-muted-foreground" strokeWidth={2} />,
            creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.SMART_PDF_TO_EXCEL],
            isAuthRequired: ChatModeConfig[ChatMode.SMART_PDF_TO_EXCEL].isAuthRequired,
            isNew: ChatModeConfig[ChatMode.SMART_PDF_TO_EXCEL].isNew,
            category: 'advanced',
        },
        // Active model
        {
            id: ChatMode.GEMINI_2_5_FLASH,
            name: 'Gemini 2.5 Flash',
            icon: ModelIcons.GEMINI,
            creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.GEMINI_2_5_FLASH],
            isAuthRequired: ChatModeConfig[ChatMode.GEMINI_2_5_FLASH].isAuthRequired,
            category: 'standard',
        },
        /* Masqué à la demande (Zen): garder le code mais ne pas afficher cette option.
        {
            id: ChatMode.GEMINI_2_5_PRO,
            name: 'Gemini 2.5 Pro',
            icon: ModelIcons.GEMINI,
            creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.GEMINI_2_5_PRO],
            isAuthRequired: ChatModeConfig[ChatMode.GEMINI_2_5_PRO].isAuthRequired,
            category: 'standard',
        },
        */
        // Commented models (will be filtered out below)
        // {
        //     id: ChatMode.LLAMA_4_SCOUT,
        //     name: 'Llama 4 Scout',
        //     icon: ModelIcons.META,
        //     creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.LLAMA_4_SCOUT],
        //     isAuthRequired: ChatModeConfig[ChatMode.LLAMA_4_SCOUT].isAuthRequired,
        //     isNew: ChatModeConfig[ChatMode.LLAMA_4_SCOUT].isNew,
        //     category: 'standard',
        // },
        // {
        //     id: ChatMode.GPT_4_1,
        //     name: 'GPT 4.1',
        //     icon: ModelIcons.OPENAI,
        //     creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.GPT_4_1],
        //     isAuthRequired: ChatModeConfig[ChatMode.GPT_4_1].isAuthRequired,
        //     isNew: ChatModeConfig[ChatMode.GPT_4_1].isNew,
        //     category: 'standard',
        // },
        // {
        //     id: ChatMode.GPT_4_1_Mini,
        //     name: 'GPT 4.1 Mini',
        //     icon: ModelIcons.OPENAI,
        //     creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.GPT_4_1_Mini],
        //     isAuthRequired: ChatModeConfig[ChatMode.GPT_4_1_Mini].isAuthRequired,
        //     isNew: ChatModeConfig[ChatMode.GPT_4_1_Mini].isNew,
        //     category: 'standard',
        // },
        // {
        //     id: ChatMode.GPT_4_1_Nano,
        //     name: 'GPT 4.1 Nano',
        //     icon: ModelIcons.OPENAI,
        //     creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.GPT_4_1_Nano],
        //     isAuthRequired: ChatModeConfig[ChatMode.GPT_4_1_Nano].isAuthRequired,
        //     isNew: ChatModeConfig[ChatMode.GPT_4_1_Nano].isNew,
        //     category: 'standard',
        // },
        // {
        //     id: ChatMode.GPT_4o_Mini,
        //     name: 'GPT 4o Mini',
        //     icon: ModelIcons.OPENAI,
        //     creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.GPT_4o_Mini],
        //     isAuthRequired: ChatModeConfig[ChatMode.GPT_4o_Mini].isAuthRequired,
        //     category: 'standard',
        // },
        // {
        //     id: ChatMode.O4_Mini,
        //     name: 'O4 Mini',
        //     icon: ModelIcons.OPENAI,
        //     creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.O4_Mini],
        //     isAuthRequired: ChatModeConfig[ChatMode.O4_Mini].isAuthRequired,
        //     isNew: ChatModeConfig[ChatMode.O4_Mini].isNew,
        //     category: 'standard',
        // },
        // {
        //     id: ChatMode.CLAUDE_3_5_SONNET,
        //     name: 'Claude 3.5 Sonnet',
        //     icon: ModelIcons.ANTHROPIC,
        //     creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.CLAUDE_3_5_SONNET],
        //     isAuthRequired: ChatModeConfig[ChatMode.CLAUDE_3_5_SONNET].isAuthRequired,
        //     category: 'standard',
        // },
        // {
        //     id: ChatMode.CLAUDE_3_7_SONNET,
        //     name: 'Claude 3.7 Sonnet',
        //     icon: ModelIcons.ANTHROPIC,
        //     creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.CLAUDE_3_7_SONNET],
        //     isAuthRequired: ChatModeConfig[ChatMode.CLAUDE_3_7_SONNET].isAuthRequired,
        //     category: 'standard',
        // },
        // {
        //     id: ChatMode.DEEPSEEK_R1,
        //     name: 'DeepSeek R1',
        //     icon: ModelIcons.DEEPSEEK,
        //     creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.DEEPSEEK_R1],
        //     isAuthRequired: ChatModeConfig[ChatMode.DEEPSEEK_R1].isAuthRequired,
        //     category: 'standard',
        // },
    ];

    // Filter to only active models
    const activeModels = AI_MODELS.filter(model => !model.id.includes('//'));

    // Add credit cost and auth badge to model names
    const modelsWithBadges = activeModels.map(model => {
        const isRevision = model.id === ChatMode.REVISION_DE_PRIX;
        return {
            ...model,
            icon: isRevision ? <div className="opacity-50 cursor-not-allowed">{model.icon}</div> : model.icon,
            name: (
                <div className={cn("flex items-center gap-2", isRevision && "opacity-50 cursor-not-allowed")}> 
                    <span>{model.name}</span>
                    {isRevision ? <ComingSoonIcon /> : ChatModeConfig[model.id]?.isNew && <NewIcon />}
                </div>
            ),
        };
    });

    const sendMessage = async (value: string, modelId: string) => {
        if (!value.trim()) return;

        // Check authentication requirements
        const selectedModel = activeModels.find(m => m.id === modelId);
        if (
            !isSignedIn &&
            selectedModel?.isAuthRequired
        ) {
            push('/sign-in');
            return;
        }

        let threadId = currentThreadId?.toString();

        if (!threadId) {
            const optimisticId = uuidv4();
            push(`/chat/${optimisticId}`);
            createThread(optimisticId, {
                title: value,
            });
            threadId = optimisticId;
        }

        // Submit the message
        const formData = new FormData();
        const shouldEmbedExtraction = chatMode === ChatMode.SMART_PDF_TO_EXCEL && (imageAttachments?.length || 0) > 0;
        const effectiveQuery = shouldEmbedExtraction ? `Mode d’extraction: ${extractionLabel}\n${value}` : value;
        formData.append('query', effectiveQuery);
        if (imageAttachments && imageAttachments.length > 0) {
            imageAttachments.forEach((img, index) => {
                if (img.base64) {
                    formData.append(`imageAttachment_${index}`, img.base64);
                }
            });
            formData.append('imageAttachmentCount', imageAttachments.length.toString());
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
        setInputValue('');
        clearImageAttachments();
        setShowSuggestions(false);
        setShowExtractionPrompt(false);
    };

    const handleFileAttachment = (file: File) => {
        readImageFile(file);
        if (chatMode === ChatMode.SMART_PDF_TO_EXCEL) {
            setShowExtractionPrompt(true);
        }
    };

    const handleModelChange = (modelId: string) => {
        if (modelId === ChatMode.REVISION_DE_PRIX) {
            toast({ title: 'Bientôt disponible' });
            return;
        }
        setChatMode(modelId as ChatMode);
    };

    const renderChatInput = () => (
        <AnimatePresence>
            <motion.div
                className="w-full px-3 chat-theme"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={`chat-input`}
                transition={{ duration: 0.2, ease: 'easeOut' }}
            >
                <Flex direction="col" className="w-full">
                    <ImageDropzoneRoot dropzoneProps={dropzonProps}>
                        {(imageAttachments?.length || 0) > 0 && (
                            <div className="mb-2">
                                <ImageAttachment />
                            </div>
                        )}
                        {chatMode === ChatMode.SMART_PDF_TO_EXCEL && (imageAttachments?.length || 0) > 0 && showExtractionPrompt && (
                            <div className="mb-2 rounded-md border p-2 text-xs flex items-center justify-between" style={{ backgroundColor: 'hsl(var(--chat-input-surface-bg))', borderColor: 'hsl(var(--chat-input-border))' }}>
                                <span>Quel mode d’extraction souhaitez-vous appliquer ?</span>
                                <button
                                    type="button"
                                    onClick={() => setShowExtractionPrompt(false)}
                                    className="px-2 py-1 rounded border text-[11px]"
                                    style={{ backgroundColor: 'hsl(var(--chat-input-control-bg))', borderColor: 'hsl(var(--chat-input-border))' }}
                                >
                                    Appliquer « {extractionLabel} »
                                </button>
                            </div>
                        )}
                        <AI_Prompt
                            value={inputValue}
                            onChange={setInputValue}
                            onSend={sendMessage}
                            placeholder={isFollowUp ? 'Demander un suivi' : "Demandez n'importe quoi"}
                            models={modelsWithBadges}
                            selectedModel={chatMode}
                            onModelChange={handleModelChange}
                            onAttachFile={ChatModeConfig[chatMode]?.imageUpload ? handleFileAttachment : undefined}
                            fileAccept={(chatMode === ChatMode.GEMINI_2_5_FLASH || chatMode === ChatMode.SMART_PDF_TO_EXCEL) ? 'image/jpeg,image/png,image/gif,application/pdf' : 'image/jpeg,image/png,image/gif'}
                            disabled={isGenerating}
                            showWebToggle={!!(ChatModeConfig[chatMode]?.webSearch || hasApiKeyForChatMode(chatMode))}
                            webSearchEnabled={useWebSearch}
                            onToggleWebSearch={() => setUseWebSearch(!useWebSearch)}
                            shineColors={getShineColors(aiPromptShinePreset)}
                        />
                    </ImageDropzoneRoot>
                </Flex>
                <div className="mt-2 relative z-10 pointer-events-auto flex items-center justify-center">
                    <AnimatePresence initial={false}>
                        {chatMode === ChatMode.GEMINI_2_5_FLASH && showSuggestions && !currentThreadId && (
                            <motion.div
                                key="example-prompts"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                className="w-full"
                            >
                                <ExamplePrompts />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
            {!currentThreadId && <MessagesRemainingBadge key="remaining-messages" />}
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
        // Focus management is handled internally by the AI_Prompt component
    }, [currentThreadId]);

    return (
        <div
            className={cn(
                'bg-secondary w-full',
                currentThreadId
                    ? 'absolute bottom-0 left-0 right-0'
                    : 'absolute inset-0 flex h-full w-full flex-col items-center justify-center'
            )}
        >
            {!currentThreadId && <GridGradientBackground side="left" variant={backgroundVariant} unicornProjectId={unicornProjectId} />}
            <div
                className={cn(
                    'mx-auto flex w-full max-w-3xl flex-col items-start',
                    !threadItemsLength && 'justify-start',
                    !currentThreadId && 'px-8'
                )}
            >
                <Flex
                    items="start"
                    justify="start"
                    direction="col"
                    className={cn('w-full', threadItemsLength > 0 ? 'mb-0' : 'h-full', !currentThreadId && 'pb-4')}
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
    const [greeting, setGreeting] = React.useState<string>('');

    React.useEffect(() => {
        const getTimeBasedGreeting = () => {
            const hour = new Date().getHours();

            if (hour >= 5 && hour < 12) {
                return 'Bonjour Hyper';
            } else if (hour >= 12 && hour < 18) {
                return 'Bon après-midi Hyper';
            } else {
                return 'Bonsoir Hyper';
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
                    className="from-muted-foreground/50 via-muted-foreground/40 to-muted-foreground/20 bg-gradient-to-r bg-clip-text text-center text-[43px] font-semibold tracking-tight text-transparent"
                >
                    {greeting}
                </motion.h1>
            </AnimatePresence>
        </Flex>
    );
};
