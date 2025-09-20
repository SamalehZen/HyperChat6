



"use client";

import { ArrowRight, Bot, Check, ChevronDown, Paperclip, Globe } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { Textarea } from "./textarea";
import { cn } from "../lib/utils";
import { Button } from "./button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "./dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { ShineBorder } from "./shine-border";

interface UseAutoResizeTextareaProps {
    minHeight: number;
    maxHeight?: number;
}

function useAutoResizeTextarea({
    minHeight,
    maxHeight,
}: UseAutoResizeTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback(
        (reset?: boolean) => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            if (reset) {
                textarea.style.height = `${minHeight}px`;
                return;
            }

            textarea.style.height = `${minHeight}px`;

            const newHeight = Math.max(
                minHeight,
                Math.min(
                    textarea.scrollHeight,
                    maxHeight ?? Number.POSITIVE_INFINITY
                )
            );

            textarea.style.height = `${newHeight}px`;
        },
        [minHeight, maxHeight]
    );

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = `${minHeight}px`;
        }
    }, [minHeight]);

    useEffect(() => {
        const handleResize = () => adjustHeight();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [adjustHeight]);

    return { textareaRef, adjustHeight };
}

const OPENAI_ICON = (
    <>
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 256 260"
            aria-label="OpenAI Icon"
            className="w-4 h-4 dark:hidden block"
        >
            <title>OpenAI Icon Light</title>
            <path d="M239.184 106.203a64.716 64.716 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.716 64.716 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.665 64.665 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.767 64.767 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483Zm-97.56 136.338a48.397 48.397 0 0 1-31.105-11.255l1.535-.87 51.67-29.825a8.595 8.595 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601Zm-104.466-44.61a48.345 48.345 0 0 1-5.781-32.589l1.534.921 51.722 29.826a8.339 8.339 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803ZM23.549 85.38a48.499 48.499 0 0 1 25.58-21.333v61.39a8.288 8.288 0 0 0 4.195 7.316l62.874 36.272-21.845 12.636a.819.819 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405v.256Zm179.466 41.695-63.08-36.63L161.73 77.86a.819.819 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.544 8.544 0 0 0-4.4-7.213Zm21.742-32.69-1.535-.922-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.716.716 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391v.205ZM88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87-51.67 29.825a8.595 8.595 0 0 0-4.246 7.367l-.051 72.697Zm11.868-25.58 28.138-16.217 28.188 16.218v32.434l-28.086 16.218-28.188-16.218-.052-32.434Z" />
        </svg>
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 256 260"
            aria-label="OpenAI Icon"
            className="w-4 h-4 hidden dark:block"
        >
            <title>OpenAI Icon Dark</title>
            <path
                fill="#fff"
                d="M239.184 106.203a64.716 64.716 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.716 64.716 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.665 64.665 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.767 64.767 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483Zm-97.56 136.338a48.397 48.397 0 0 1-31.105-11.255l1.535-.87 51.67-29.825a8.595 8.595 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601Zm-104.466-44.61a48.345 48.345 0 0 1-5.781-32.589l1.534.921 51.722 29.826a8.339 8.339 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803ZM23.549 85.38a48.499 48.499 0 0 1 25.58-21.333v61.39a8.288 8.288 0 0 0 4.195 7.316l62.874 36.272-21.845 12.636a.819.819 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405v.256Zm179.466 41.695-63.08-36.63L161.73 77.86a.819.819 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.544 8.544 0 0 0-4.4-7.213Zm21.742-32.69-1.535-.922-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.716.716 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391v.205ZM88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87-51.67 29.825a8.595 8.595 0 0 0-4.246 7.367l-.051 72.697Zm11.868-25.58 28.138-16.217 28.188 16.218v32.434l-28.086 16.218-28.188-16.218-.052-32.434Z"
            />
        </svg>
    </>
);

const GEMINI_ICON = (
    <svg
        height="1em"
        className="w-4 h-4"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
    >
        <title>Gemini</title>
        <defs>
            <linearGradient
                id="lobe-icons-gemini-fill"
                x1="0%"
                x2="68.73%"
                y1="100%"
                y2="30.395%"
            >
                <stop offset="0%" stopColor="#1C7DFF" />
                <stop offset="52.021%" stopColor="#1C69FF" />
                <stop offset="100%" stopColor="#F0DCD6" />
            </linearGradient>
        </defs>
        <path
            d="M12 24A14.304 14.304 0 000 12 14.304 14.304 0 0012 0a14.305 14.305 0 0012 12 14.305 14.305 0 00-12 12"
            fill="url(#lobe-icons-gemini-fill)"
            fillRule="nonzero"
        />
    </svg>
);

const ANTHROPIC_ICON = (
    <>
        <svg
            fill="#000"
            fillRule="evenodd"
            className="w-4 h-4 dark:hidden block"
            viewBox="0 0 24 24"
            width="1em"
            xmlns="http://www.w3.org/2000/svg"
        >
            <title>Anthropic Icon Light</title>
            <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-7.258 0h3.767L16.906 20h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm4.132 9.959L8.453 7.687 6.205 13.48H10.7z" />
        </svg>
        <svg
            fill="#fff"
            fillRule="evenodd"
            className="w-4 h-4 hidden dark:block"
            viewBox="0 0 24 24"
            width="1em"
            xmlns="http://www.w3.org/2000/svg"
        >
            <title>Anthropic Icon Dark</title>
            <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-7.258 0h3.767L16.906 20h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm4.132 9.959L8.453 7.687 6.205 13.48H10.7z" />
        </svg>
    </>
);

const META_ICON = (
    <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
    >
        <title>Meta</title>
        <path
            fill="currentColor"
            d="M14.315 5C11.419 5 9.532 7.164 8.132 9.736 7.198 11.458 6.409 13.184 5.455 14.142 4.719 14.878 4.049 15.181 3.501 15.172 2.944 15.163 2.396 14.833 1.871 14.055 1.647 13.732 1.204 13.65.88 13.874s-.406.667-.182.99C1.468 15.99 2.394 16.5 3.462 16.517c1.06.017 2.088-.453 3.05-1.422 1.29-1.297 2.234-3.322 3.19-5.079C11.071 7.486 12.317 6 14.315 6c2.688 0 4.316 2.855 4.316 4.998 0 2.218-1.494 3.428-2.656 3.428-.65 0-1.201-.283-1.512-.777-.282-.448-.344-1.008-.174-1.579.167-.56.517-1.088.983-1.483a.5.5 0 0 0-.594-.805c-.602.445-1.072 1.094-1.323 1.837-.248.735-.23 1.511.202 2.197.477.76 1.325 1.235 2.31 1.235C17.677 15.051 20 13.267 20 10.998 20 8.288 18.12 5 14.315 5Z"
        />
    </svg>
);

const DEEPSEEK_ICON = (
    <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
    >
        <title>DeepSeek</title>
        <path
            fill="currentColor"
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"
        />
    </svg>
);

interface AI_PromptProps {
    value?: string;
    onChange?: (value: string) => void;
    onSend?: (value: string, model: string) => void;
    placeholder?: string;
    models?: { id: string; name: string | React.ReactNode; icon?: React.ReactNode }[];
    selectedModel?: string;
    onModelChange?: (model: string) => void;
    onAttachFile?: (file: File) => void;
    fileAccept?: string;
    disabled?: boolean;
    showWebToggle?: boolean;
    webSearchEnabled?: boolean;
    onToggleWebSearch?: () => void;
    shineColors?: string[];
}

export function AI_Prompt({
    value: controlledValue,
    onChange,
    onSend,
    placeholder = "Demandez n'importe quoi",
    models = [],
    selectedModel: controlledSelectedModel,
    onModelChange,
    onAttachFile,
    fileAccept,
    disabled = false,
    showWebToggle = false,
    webSearchEnabled = false,
    onToggleWebSearch,
    shineColors,
}: AI_PromptProps) {
    const [internalValue, setInternalValue] = useState("");
    const [internalSelectedModel, setInternalSelectedModel] = useState(models[0]?.id || "");
    
    const value = controlledValue !== undefined ? controlledValue : internalValue;
    const selectedModel = controlledSelectedModel !== undefined ? controlledSelectedModel : internalSelectedModel;
    
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 72,
        maxHeight: 300,
    });

    const handleValueChange = (newValue: string) => {
        if (controlledValue === undefined) {
            setInternalValue(newValue);
        }
        onChange?.(newValue);
    };

    const handleModelChange = (newModel: string) => {
        if (controlledSelectedModel === undefined) {
            setInternalSelectedModel(newModel);
        }
        onModelChange?.(newModel);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey && value.trim() && !disabled) {
            e.preventDefault();
            onSend?.(value, selectedModel);
            handleValueChange("");
            adjustHeight(true);
        }
    };

    const handleSendClick = () => {
        if (!value.trim() || disabled) return;
        onSend?.(value, selectedModel);
        handleValueChange("");
        adjustHeight(true);
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onAttachFile?.(file);
        }
    };

    const selectedModelData = models.find(m => m.id === selectedModel);

    const portalRef = useRef<HTMLDivElement>(null);

    return (
        <div className="w-full" ref={portalRef}>
            <ShineBorder
                className="w-full p-0"
                borderRadius={16}
                borderWidth={2}
                duration={10}
                color={shineColors ?? ["#3B82F6", "#8B5CF6", "#F97316"]}
            >
                <div className="bg-gray-100 dark:bg-gray-900 rounded-2xl p-1.5 border border-[#e5e7eb] dark:border-gray-800" style={{ backgroundColor: 'hsl(var(--chat-input-container-bg))', borderColor: 'hsl(var(--chat-input-border))' }}>
                    <div className="relative">
                        <div className="relative flex flex-col">
                        <div
                            className="overflow-y-auto"
                            style={{ maxHeight: "400px" }}
                        >
                            <Textarea style={{ backgroundColor: 'hsl(var(--chat-input-surface-bg))', borderColor: 'hsl(var(--chat-input-border))', boxShadow: 'var(--chat-input-surface-shadow)' }}
                                value={value}
                                placeholder={placeholder}
                                className={cn(
                                    "w-full rounded-xl rounded-b-none px-4 py-3",
                                    "bg-white dark:bg-gray-800",
                                    "text-gray-900 dark:text-white",
                                    "placeholder:text-gray-500 dark:placeholder:text-gray-400",
                                    "border border-[#e5e7eb] dark:border-gray-700",
                                    "resize-none focus-visible:ring-2 focus-visible:ring-gray-600 focus-visible:ring-offset-0",
                                    "min-h-[72px]"
                                )}
                                ref={textareaRef}
                                onKeyDown={handleKeyDown}
                                onChange={(e) => {
                                    handleValueChange(e.target.value);
                                    adjustHeight();
                                }}
                                disabled={disabled}
                            />
                        </div>

                        <div className="h-14 bg-white dark:bg-gray-800 rounded-b-xl border border-t-0 border-[#e5e7eb] dark:border-gray-700 flex items-center" style={{ backgroundColor: 'hsl(var(--chat-input-surface-bg))', borderColor: 'hsl(var(--chat-input-border))', boxShadow: 'var(--chat-input-surface-shadow)' }}>
                            <div className="absolute left-3 right-3 bottom-3 flex items-center justify-between w-[calc(100%-24px)]">
                                <div className="flex items-center gap-2">
                                    {models.length > 0 && (
                                        <>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        className="flex items-center gap-1 h-8 pl-1 pr-2 text-xs rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-gray-600"
                                                        disabled={disabled}
                                                    >
                                                        <AnimatePresence mode="wait">
                                                            <motion.div
                                                                key={selectedModel}
                                                                initial={{
                                                                    opacity: 0,
                                                                    y: -5,
                                                                }}
                                                                animate={{
                                                                    opacity: 1,
                                                                    y: 0,
                                                                }}
                                                                exit={{
                                                                    opacity: 0,
                                                                    y: 5,
                                                                }}
                                                                transition={{
                                                                    duration: 0.15,
                                                                }}
                                                                className="flex items-center gap-1"
                                                            >
                                                                {selectedModelData?.icon || <Bot className="w-4 h-4" />}
                                                                {selectedModelData?.name || selectedModel}
                                                                <ChevronDown className="w-3 h-3 opacity-50" />
                                                            </motion.div>
                                                        </AnimatePresence>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent
                                                    className={cn(
                                                        "min-w-[10rem]",
                                                        "shadow-lg"
                                                    )}
                                                    container={portalRef.current ?? undefined}
                                                    style={{
                                                        backgroundColor: 'hsl(var(--chat-input-surface-bg))',
                                                        borderColor: 'hsl(var(--chat-input-border))',
                                                        boxShadow: 'var(--chat-input-surface-shadow)'
                                                    }}
                                                >
                                                    {models.map((model) => (
                                                        <DropdownMenuItem
                                                            key={model.id}
                                                            onSelect={() => handleModelChange(model.id)}
                                                            className="flex items-center justify-between gap-2"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                {model.icon || <Bot className="w-4 h-4 opacity-50" />}
                                                                {model.name}
                                                            </div>
                                                            {selectedModel === model.id && (
                                                                <Check className="w-4 h-4 text-gray-400" />
                                                            )}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-0.5" />
                                        </>
                                    )}
                                    {showWebToggle && (
                                        <button
                                            type="button"
                                            onClick={() => !disabled && onToggleWebSearch?.()}
                                            aria-pressed={!!webSearchEnabled}
                                            aria-label="Toggle web search"
                                            className={cn(
                                                "rounded-lg transition-all flex items-center gap-1 px-2 py-1 h-8 border",
                                                "bg-[hsl(var(--chat-input-control-bg))] hover:bg-[hsl(var(--chat-input-control-hover-bg))]",
                                                "focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-[hsl(var(--chat-input-border))]",
                                                webSearchEnabled
                                                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                                                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white",
                                                disabled && "opacity-50 cursor-not-allowed"
                                            )}
                                            disabled={disabled}
                                        >
                                            <div className="w-5 h-5 flex items-center justify-center">
                                                <motion.div
                                                    animate={{ rotate: webSearchEnabled ? 360 : 0, scale: webSearchEnabled ? 1.1 : 1 }}
                                                    whileHover={{ scale: 1.1, transition: { type: "spring", stiffness: 300 } }}
                                                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                                                >
                                                    <Globe className="w-4 h-4" />
                                                </motion.div>
                                            </div>

                                            <AnimatePresence>
                                                {webSearchEnabled && (
                                                    <motion.span
                                                        initial={{ width: 0, opacity: 0 }}
                                                        animate={{ width: "auto", opacity: 1 }}
                                                        exit={{ width: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="text-xs overflow-hidden whitespace-nowrap"
                                                    >
                                                        Search
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>
                                        </button>
                                    )}
                                    {onAttachFile && (
                                        <label
                                            className={cn(
                                                "rounded-lg p-2",
                                                "bg-[hsl(var(--chat-input-control-bg))] hover:bg-[hsl(var(--chat-input-control-hover-bg))]",
                                                "focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-[hsl(var(--chat-input-border))]",
                                                "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white",
                                                "transition-colors cursor-pointer",
                                                disabled && "opacity-50 cursor-not-allowed"
                                            )}
                                            aria-label="Attach file"
                                        >
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                onChange={handleFileInputChange}
                                                disabled={disabled}
                                                accept={fileAccept || "image/jpeg,image/png,image/gif"}
                                            />
                                            <Paperclip className="w-4 h-4" />
                                        </label>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    className={cn(
                                        "rounded-lg p-2",
                                        "bg-[hsl(var(--chat-input-control-bg))] hover:bg-[hsl(var(--chat-input-control-hover-bg))]",
                                        "focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-[hsl(var(--chat-input-border))]",
                                        "transition-colors",
                                        disabled && "opacity-50 cursor-not-allowed"
                                    )}
                                    aria-label="Send message"
                                    disabled={!value.trim() || disabled}
                                    onClick={handleSendClick}
                                >
                                    <ArrowRight
                                        className={cn(
                                            "w-4 h-4 transition-opacity duration-200",
                                            value.trim() && !disabled
                                                ? "text-gray-900 dark:text-white opacity-100"
                                                : "text-gray-400 dark:text-gray-500 opacity-50"
                                        )}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </ShineBorder>
        </div>
    );
}

// Export icons for external use
export const ModelIcons = {
    OPENAI: OPENAI_ICON,
    GEMINI: GEMINI_ICON,
    ANTHROPIC: ANTHROPIC_ICON,
    META: META_ICON,
    DEEPSEEK: DEEPSEEK_ICON,
};
