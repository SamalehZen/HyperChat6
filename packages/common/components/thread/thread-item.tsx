import {
    CitationProvider,
    FollowupSuggestions,
    MarkdownContent,
    Message,
    MessageActions,
    QuestionPrompt,
    SourceGrid,
    Steps,
    BorderTrail,
    Skeleton,
} from '@repo/common/components';
import { useAnimatedText } from '@repo/common/hooks';
import { useChatStore } from '@repo/common/store';
import { ThreadItem as ThreadItemType } from '@repo/shared/types';
import { Alert, AlertDescription, cn } from '@repo/ui';
import { IconAlertCircle, IconBook } from '@tabler/icons-react';
import { memo, useEffect, useMemo, useRef } from 'react';
import { useInView } from 'react-intersection-observer';

export const ThreadItem = memo(
    ({
        threadItem,
        isGenerating,
        isLast,
    }: {
        isAnimated: boolean;
        threadItem: ThreadItemType;
        isGenerating: boolean;
        isLast: boolean;
    }) => {
        const { isAnimationComplete, text: animatedText } = useAnimatedText(
            threadItem.answer?.text || '',
            isLast && isGenerating
        );
        const setCurrentSources = useChatStore(state => state.setCurrentSources);
        const messageRef = useRef<HTMLDivElement>(null);

        const { ref: inViewRef, inView } = useInView({});

        useEffect(() => {
            if (inView && threadItem.id) {
                useChatStore.getState().setActiveThreadItemView(threadItem.id);
            }
        }, [inView, threadItem.id]);

        useEffect(() => {
            const sources =
                Object.values(threadItem.steps || {})
                    ?.filter(
                        step =>
                            step.steps && 'read' in step?.steps && !!step.steps?.read?.data?.length
                    )
                    .flatMap(step => step.steps?.read?.data?.map((result: any) => result.link))
                    .filter((link): link is string => link !== undefined) || [];
            return setCurrentSources(sources);
        }, [threadItem]);

        const hasAnswer = useMemo(() => {
            return threadItem.answer?.text && threadItem.answer?.text.length > 0;
        }, [threadItem.answer]);

        const hasResponse = useMemo(() => {
            return (
                !!threadItem?.steps ||
                !!threadItem?.answer?.text ||
                !!threadItem?.object ||
                !!threadItem?.error ||
                threadItem?.status === 'COMPLETED' ||
                threadItem?.status === 'ABORTED' ||
                threadItem?.status === 'ERROR'
            );
        }, [threadItem]);
        return (
            <CitationProvider sources={threadItem.sources || []}>
                <div className="w-full" ref={inViewRef} id={`thread-item-${threadItem.id}`}>
                    <div className={cn('flex w-full flex-col items-start gap-3 pt-4')}>
                        {threadItem.query && (
                            <Message
                                message={threadItem.query}
                                imageAttachments={threadItem?.imageAttachment}
                                threadItem={threadItem}
                            />
                        )}

                        <div className="text-muted-foreground flex flex-row items-center gap-1.5 text-xs font-medium">
                            <IconBook size={16} strokeWidth={2} />
                            Réponse
                        </div>

                        {threadItem.steps && (
                            <Steps
                                steps={Object.values(threadItem?.steps || {})}
                                threadItem={threadItem}
                            />
                        )}

                        {!hasResponse && (
                            <div
                                className="relative w-full rounded-xl border border-neutral-200 dark:border-neutral-800"
                                role="status"
                                aria-busy="true"
                            >
                                <BorderTrail color="#f97316" duration={1200} thickness={2} rounded={12} inset={0} />
                                <div className="flex w-full flex-col items-start gap-2 p-4">
                                    <Skeleton className="mb-2 h-4 w-[100px] rounded-sm" />
                                    <Skeleton className="h-4 w-full rounded" />
                                    <Skeleton className="h-4 w-[70%] rounded" />
                                    <Skeleton className="h-4 w-[50%] rounded" />
                                </div>
                            </div>
                        )}

                        <div ref={messageRef} className="w-full">
                            {hasAnswer && threadItem.answer?.text && (
                                <div className="flex flex-col">
                                    <SourceGrid sources={threadItem.sources || []} />

                                    <MarkdownContent
                                        content={animatedText || ''}
                                        key={`answer-${threadItem.id}`}
                                        isCompleted={['COMPLETED', 'ERROR', 'ABORTED'].includes(
                                            threadItem.status || ''
                                        )}
                                        shouldAnimate={
                                            !['COMPLETED', 'ERROR', 'ABORTED'].includes(
                                                threadItem.status || ''
                                            )
                                        }
                                        isLast={isLast}
                                        totalAttachments={Array.isArray(threadItem?.imageAttachment) ? threadItem.imageAttachment.length : (threadItem?.imageAttachment ? 1 : 0)}
                                    />
                                </div>
                            )}
                        </div>
                        <QuestionPrompt threadItem={threadItem} />
                        {threadItem.error && (
                            <Alert variant="destructive">
                                <AlertDescription>
                                    <IconAlertCircle className="mt-0.5 size-3.5" />
                                    {typeof threadItem.error === 'string'
                                        ? threadItem.error
                                        : "Quelque chose s'est mal passé lors du traitement de votre demande. Veuillez réessayer."}
                                </AlertDescription>
                            </Alert>
                        )}

                        {threadItem.status === 'ABORTED' && (
                            <Alert variant="warning">
                                <AlertDescription>
                                    <IconAlertCircle className="mt-0.5 size-3.5" />
                                    {threadItem.error ?? 'Generation stopped'}
                                </AlertDescription>
                            </Alert>
                        )}

                        {isAnimationComplete &&
                            (threadItem.status === 'COMPLETED' ||
                                threadItem.status === 'ABORTED' ||
                                threadItem.status === 'ERROR' ||
                                !isGenerating) && (
                                <MessageActions
                                    threadItem={threadItem}
                                    ref={messageRef}
                                    isLast={isLast}
                                />
                            )}
                        {isAnimationComplete && isLast && (
                            <FollowupSuggestions suggestions={threadItem.suggestions || []} />
                        )}
                    </div>
                </div>
            </CitationProvider>
        );
    },
    (prevProps, nextProps) => {
        return JSON.stringify(prevProps.threadItem) === JSON.stringify(nextProps.threadItem);
    }
);

ThreadItem.displayName = 'ThreadItem';
