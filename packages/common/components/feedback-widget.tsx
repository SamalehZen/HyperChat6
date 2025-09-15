import { useAuth } from '@clerk/nextjs';
import { Button, Textarea } from '@repo/ui';
import { IconCircleCheckFilled, IconHelpSmall, IconX } from './icons';
import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { useI18n } from '@repo/common/i18n';

export const FeedbackWidget = () => {
    const { userId } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const { t } = useI18n();

    const handleSubmit = async () => {
        if (!feedback.trim()) return;

        setIsSubmitting(true);

        try {
            await fetch('/api/feedback', {
                method: 'POST',
                body: JSON.stringify({ feedback }),
            });
            setIsSuccess(true);
            setFeedback('');

            setTimeout(() => {
                setIsSuccess(false);
                setIsOpen(false);
            }, 2000);
        } catch (error) {
            console.error('Failed to submit feedback:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!userId) {
        return null;
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex items-end justify-end">
            <AnimatePresence mode="wait">
                {!isOpen ? (
                    <motion.button
                        className=" bg-muted-foreground/30 text-background flex h-6 w-6 items-center justify-center rounded-full shadow-2xl"
                        aria-label={t('feedback.open')}
                        onClick={() => {
                            setIsOpen(true);
                            setTimeout(() => {
                                inputRef.current?.focus();
                            }, 100);
                        }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                    >
                        <IconHelpSmall size={24} strokeWidth={2} className="text-background" />
                    </motion.button>
                ) : (
                    <motion.div
                        className="border-hard w-80 max-w-xs rounded-xl border bg-white shadow-2xl"
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                    >
                        {!isSuccess ? (
                            <>
                                <div className="flex w-full flex-row justify-between px-4 pt-4">
                                    <p className="text-sm font-medium">{t('feedback.title')}</p>
                                    <Button
                                        variant="ghost"
                                        size="icon-xs"
                                        rounded="full"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <IconX size={14} strokeWidth={2} />
                                    </Button>
                                </div>
                                <Textarea
                                    placeholder={t('feedback.placeholder')}
                                    value={feedback}
                                    className="placeholder:text-muted-foreground/50 border-none bg-transparent px-4 py-2"
                                    onChange={e => setFeedback(e.target.value)}
                                    ref={inputRef}
                                />
                                <div className="flex w-full flex-row justify-end px-4 pb-4">
                                    <Button
                                        variant="default"
                                        size="xs"
                                        disabled={isSubmitting || !feedback.trim()}
                                        rounded="full"
                                        onClick={handleSubmit}
                                    >
                                        {isSubmitting ? t('feedback.sending') : t('feedback.submit')}
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="flex w-full flex-row gap-3 p-4">
                                <div className="flex flex-col items-center justify-center">
                                    <IconCircleCheckFilled
                                        size={24}
                                        strokeWidth={2}
                                        className="text-brand"
                                    />
                                </div>
                                <div className="flex flex-col gap-0">
                                    <p className="text-sm font-medium">{t('feedback.success.title')}</p>
                                    <p className="text-muted-foreground/50 text-sm">
                                        {t('feedback.success.desc')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
