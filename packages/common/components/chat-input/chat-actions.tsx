'use client';
import { useAuth } from '@repo/common/context';
import { SearchLoadingState, getModelThemeByChatMode } from '@repo/common/components';
import { useApiKeysStore, useChatStore } from '@repo/common/store';
import { CHAT_MODE_CREDIT_COSTS, ChatMode, ChatModeConfig } from '@repo/shared/config';
import { useEffectivePreferences } from '@repo/common/hooks';
import {
    Button,
    cn,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    Kbd,
} from '@repo/ui';
import {
    IconArrowUp,
    IconAtom,
    IconCheck,
    IconChevronDown,
    IconNorthStar,
    IconPaperclip,
    IconPlayerStopFilled,
    IconTable,
    IconWorld,
} from '@tabler/icons-react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { NewIcon, NomenclatureDouaniereIcon } from '../icons';

export const chatOptions = [
    {
        label: 'Recherche Approfondie',
        description: 'Recherche approfondie sur des sujets complexes',
        value: ChatMode.Deep,
        icon: <IconAtom size={16} className="text-muted-foreground" strokeWidth={2} />,
        creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.Deep],
    },
    {
        label: 'Recherche Pro',
        description: 'Recherche professionnelle avec accès web',
        value: ChatMode.Pro,
        icon: <IconNorthStar size={16} className="text-muted-foreground" strokeWidth={2} />,
        creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.Pro],
    },
    {
        label: 'Correction',
        description: 'Correction des libellés de produits',
        value: ChatMode.CORRECTION,
        icon: <IconCheck size={16} className="text-muted-foreground" strokeWidth={2} />,
        creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.CORRECTION],
    },
    {
        label: 'Classification Structure',
        description: 'Classification d\'articles de magasin',
        value: ChatMode.CLASSIFICATION,
        icon: <IconTable size={16} className="text-muted-foreground" strokeWidth={2} />,
        creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.CLASSIFICATION],
    },
    {
        label: 'Nomenclature Douanière',
        description: 'Identifier la nomenclature',
        value: ChatMode.NOMENCLATURE_DOUANIERE,
        icon: <NomenclatureDouaniereIcon />,
        creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.NOMENCLATURE_DOUANIERE],
    },
    {
        label: 'Smart PDF to Excel',
        description: 'Convertir facture PDF en Excel',
        value: ChatMode.SMART_PDF_TO_EXCEL,
        icon: <IconTable size={16} className="text-muted-foreground" strokeWidth={2} />,
        creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.SMART_PDF_TO_EXCEL],
    },
];

export const modelOptions = [
    // {
    //     label: 'Llama 4 Scout',
    //     value: ChatMode.LLAMA_4_SCOUT,
    //     // webSearch: true,
    //     icon: undefined,
    //     creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.LLAMA_4_SCOUT],
    // },
    // {
    //     label: 'GPT 4.1',
    //     value: ChatMode.GPT_4_1,
    //     // webSearch: true,
    //     icon: undefined,
    //     creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.GPT_4_1],
    // },
    // {
    //     label: 'GPT 4.1 Mini',
    //     value: ChatMode.GPT_4_1_Mini,
    //     // webSearch: true,
    //     icon: undefined,
    //     creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.GPT_4_1_Mini],
    // },
    // {
    //     label: 'GPT 4.1 Nano',
    //     value: ChatMode.GPT_4_1_Nano,
    //     // webSearch: true,
    //     icon: undefined,
    //     creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.GPT_4_1_Nano],
    // },
    {
        label: 'Gemini Flash 2.0',
        value: ChatMode.GEMINI_2_5_FLASH,
        // webSearch: true,
        icon: undefined,
        creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.GEMINI_2_5_FLASH],
    },

    // {
    //     label: 'GPT 4o Mini',
    //     value: ChatMode.GPT_4o_Mini,
    //     // webSearch: true,
    //     icon: undefined,
    //     creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.GPT_4o_Mini],
    // },

    // {
    //     label: 'O4 Mini',
    //     value: ChatMode.O4_Mini,
    //     // webSearch: true,
    //     icon: undefined,
    //     creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.O4_Mini],
    // },

    // {
    //     label: 'Claude 3.5 Sonnet',
    //     value: ChatMode.CLAUDE_3_5_SONNET,
    //     // webSearch: true,
    //     icon: undefined,
    //     creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.CLAUDE_3_5_SONNET],
    // },

    // {
    //     label: 'Deepseek R1',
    //     value: ChatMode.DEEPSEEK_R1,
    //     // webSearch: true,
    //     icon: undefined,
    //     creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.DEEPSEEK_R1],
    // },

    // {
    //     label: 'Claude 3.7 Sonnet',
    //     value: ChatMode.CLAUDE_3_7_SONNET,
    //     // webSearch: true,
    //     icon: undefined,
    //     creditCost: CHAT_MODE_CREDIT_COSTS[ChatMode.CLAUDE_3_7_SONNET],
    // },
];

export const AttachmentButton = () => {
    return (
        <Button
            size="icon"
            tooltip="Attachment (coming soon)"
            variant="ghost"
            className="gap-2"
            rounded="full"
            disabled
        >
            <IconPaperclip size={18} strokeWidth={2} className="text-muted-foreground" />
        </Button>
    );
};

export const ChatModeButton = () => {
    const chatMode = useChatStore(state => state.chatMode);
    const setChatMode = useChatStore(state => state.setChatMode);
    const effective = useEffectivePreferences();
    const allowed = (effective as any)?.allowedChatModes as string[] | undefined;
    const restrict = !!(allowed && allowed.length > 0);
    const [isChatModeOpen, setIsChatModeOpen] = useState(false);
    const hasApiKeyForChatMode = useApiKeysStore(state => state.hasApiKeyForChatMode);
    const isChatPage = usePathname().startsWith('/chat');

    const allOptions = isChatPage ? [...chatOptions, ...modelOptions] : [...modelOptions];
    const filteredAll = allOptions.filter(opt => !restrict || allowed!.includes(opt.value));
    const selectedOption = filteredAll.find(option => option.value === chatMode) ?? filteredAll[0] ?? modelOptions[0];

    // Ensure current chatMode is allowed
    if (restrict && !allowed!.includes(chatMode) && filteredAll[0]) {
        setChatMode(filteredAll[0].value);
    }

    return (
        <DropdownMenu open={isChatModeOpen} onOpenChange={setIsChatModeOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant={'secondary'} size="xs">
                    {selectedOption?.icon}
                    {selectedOption?.label}
                    <IconChevronDown size={14} strokeWidth={2} />
                </Button>
            </DropdownMenuTrigger>
            <ChatModeOptions chatMode={chatMode} setChatMode={setChatMode} />
        </DropdownMenu>
    );
};

export const WebSearchButton = () => {
    const useWebSearch = useChatStore(state => state.useWebSearch);
    const setUseWebSearch = useChatStore(state => state.setUseWebSearch);
    const chatMode = useChatStore(state => state.chatMode);
    const hasApiKeyForChatMode = useApiKeysStore(state => state.hasApiKeyForChatMode);

    if (!ChatModeConfig[chatMode]?.webSearch && !hasApiKeyForChatMode(chatMode)) return null;

    return (
        <Button
            size={useWebSearch ? 'sm' : 'icon-sm'}
            tooltip="Web Search"
            variant={useWebSearch ? 'secondary' : 'ghost'}
            className={cn('gap-2', useWebSearch && 'bg-blue-500/10 text-blue-500')}
            onClick={() => setUseWebSearch(!useWebSearch)}
        >
            <IconWorld
                size={16}
                strokeWidth={2}
                className={cn(useWebSearch ? '!text-blue-500' : 'text-muted-foreground')}
            />
            {useWebSearch && <p className="text-xs">Web</p>}
        </Button>
    );
};

export const NewLineIndicator = () => {
    const editor = useChatStore(state => state.editor);
    const hasTextInput = !!editor?.getText();

    if (!hasTextInput) return null;

    return (
        <p className="flex flex-row items-center gap-1 text-xs text-gray-500">
            use <Kbd>Shift</Kbd> <Kbd>Enter</Kbd> for new line
        </p>
    );
};

export const GeneratingStatus = () => {
    const chatMode = useChatStore(state => state.chatMode);
    const theme = getModelThemeByChatMode(chatMode);
    return (
        <div className="overflow-hidden rounded-2xl">
            <SearchLoadingState
                className="h-[72px] my-0 py-2 rounded-3xl"
                icon={theme.icon}
                text="Préparation de la réponse…"
                gradientClass={theme.gradientClass}
                iconBgClass={theme.iconBgClass}
            />
        </div>
    );
};

export const ChatModeOptions = ({
    chatMode,
    setChatMode,
    isRetry = false,
}: {
    chatMode: ChatMode;
    setChatMode: (chatMode: ChatMode) => void;
    isRetry?: boolean;
}) => {
    const { isSignedIn } = useAuth();
    const isChatPage = usePathname().startsWith('/chat');
    const { push } = useRouter();
    const effective = useEffectivePreferences();
    const allowed = (effective as any)?.allowedChatModes as string[] | undefined;
    const restrict = !!(allowed && allowed.length > 0);
    return (
        <DropdownMenuContent
            align="start"
            side="bottom"
            className="no-scrollbar max-h-[300px] w-[300px] overflow-y-auto"
        >
            {isChatPage && (
                <DropdownMenuGroup>
                    <DropdownMenuLabel>Advanced Mode</DropdownMenuLabel>
                    {chatOptions.filter(opt => !restrict || allowed!.includes(opt.value)).map(option => (
                        <DropdownMenuItem
                            key={option.label}
                            onSelect={() => {
                                if (ChatModeConfig[option.value]?.isAuthRequired && !isSignedIn) {
                                    push('/sign-in');
                                    return;
                                }
                                setChatMode(option.value);
                            }}
                            className="h-auto"
                        >
                            <div className="flex w-full flex-row items-start gap-1.5 px-1.5 py-1.5">
                                <div className="flex flex-col gap-0 pt-1">{option.icon}</div>

                                <div className="flex flex-col gap-0">
                                    {<p className="m-0 text-sm font-medium">{option.label}</p>}
                                    {option.description && (
                                        <p className="text-muted-foreground text-xs font-light">
                                            {option.description}
                                        </p>
                                    )}
                                </div>
                                <div className="flex-1" />
                                {ChatModeConfig[option.value]?.isNew && <NewIcon />}
                            </div>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuGroup>
            )}
            <DropdownMenuGroup>
                <DropdownMenuLabel>Models</DropdownMenuLabel>
                {modelOptions.filter(opt => !restrict || allowed!.includes(opt.value)).map(option => (
                    <DropdownMenuItem
                        key={option.label}
                        onSelect={() => {
                            if (ChatModeConfig[option.value]?.isAuthRequired && !isSignedIn) {
                                push('/sign-in');
                                return;
                            }
                            setChatMode(option.value);
                        }}
                        className="h-auto"
                    >
                        <div className="flex w-full flex-row items-center gap-2.5 px-1.5 py-1.5">
                            <div className="flex flex-col gap-0">
                                {<p className="text-sm font-medium">{option.label}</p>}
                            </div>
                            <div className="flex-1" />
                            {ChatModeConfig[option.value]?.isNew && <NewIcon />}


                        </div>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuGroup>
        </DropdownMenuContent>
    );
};

export const SendStopButton = ({
    isGenerating,
    isChatPage,
    stopGeneration,
    hasTextInput,
    sendMessage,
}: {
    isGenerating: boolean;
    isChatPage: boolean;
    stopGeneration: () => void;
    hasTextInput: boolean;
    sendMessage: () => void;
}) => {
    return (
        <div className="flex flex-row items-center gap-2">
            <AnimatePresence mode="wait" initial={false}>
                {isGenerating && !isChatPage ? (
                    <motion.div
                        key="stop-button"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Button
                            size="icon-sm"
                            variant="default"
                            onClick={stopGeneration}
                            tooltip="Stop Generation"
                        >
                            <IconPlayerStopFilled size={14} strokeWidth={2} />
                        </Button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="send-button"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Button
                            size="icon-sm"
                            tooltip="Send Message"
                            variant={hasTextInput ? 'default' : 'secondary'}
                            disabled={!hasTextInput || isGenerating}
                            onClick={() => {
                                sendMessage();
                            }}
                        >
                            <IconArrowUp size={16} strokeWidth={2} />
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
