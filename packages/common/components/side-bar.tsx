'use client';
import { useClerk, useUser } from '@clerk/nextjs';
import { FullPageLoader, HistoryItem, Logo } from '@repo/common/components';
import { useRootContext } from '@repo/common/context';
import { useAppStore, useChatStore } from '@repo/common/store';
import { Thread } from '@repo/shared/types';
import {
    Badge,
    Button,
    cn,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    Flex,
} from '@repo/ui';
import {
    IconArrowBarLeft,
    IconArrowBarRight,
    IconCommand,
    IconLogout,
    IconPinned,
    IconPlus,
    IconSearch,
    IconSelector,
    IconSettings,
    IconSettings2,
    IconUser,
} from './icons';
import moment from 'moment';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '@repo/common/i18n';

export const Sidebar = () => {
    const { threadId: currentThreadId } = useParams();
    const pathname = usePathname();
    const { setIsCommandSearchOpen } = useRootContext();
    const isChatPage = pathname === '/chat';
    const allThreads = useChatStore(state => state.threads);
    const listThreads = useChatStore(state => state.listThreads);
    const countThreads = useChatStore(state => state.countThreads);
    const pinThread = useChatStore(state => state.pinThread);
    const unpinThread = useChatStore(state => state.unpinThread);
    const { t } = useI18n();

    const { isSignedIn, user } = useUser();
    const { openUserProfile, signOut } = useClerk();
    const setIsSidebarOpen = useAppStore(state => state.setIsSidebarOpen);
    const isSidebarOpen = useAppStore(state => state.isSidebarOpen);
    const setIsSettingsOpen = useAppStore(state => state.setIsSettingsOpen);
    const { push } = useRouter();

    const pageSize = 30;
    const [offset, setOffset] = useState(0);
    const [loadedThreads, setLoadedThreads] = useState<Thread[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        let cancelled = false;
        const loadInitial = async () => {
            setIsLoading(true);
            try {
                const items = await listThreads({ offset: 0, limit: pageSize, sort: 'createdAt' });
                if (!cancelled) {
                    setLoadedThreads(items);
                    setOffset(items.length);
                    const total = await countThreads(true);
                    setHasMore(items.length < total);
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };
        loadInitial();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadMore = async () => {
        if (isLoading || !hasMore) return;
        setIsLoading(true);
        try {
            const items = await listThreads({ offset, limit: pageSize, sort: 'createdAt' });
            setLoadedThreads(prev => [...prev, ...items]);
            setOffset(prev => prev + items.length);
            if (items.length < pageSize) setHasMore(false);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!sentinelRef.current) return;
        const el = sentinelRef.current;
        const io = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    loadMore();
                }
            });
        }, { rootMargin: '200px' });
        io.observe(el);
        return () => io.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sentinelRef.current, hasMore, isLoading]);

    const groupedThreads = useMemo(() => {
        const groups: Record<string, Thread[]> = {
            today: [],
            yesterday: [],
            last7Days: [],
            last30Days: [],
            previousMonths: [],
        };
        loadedThreads.forEach(thread => {
            const createdAt = moment(thread.createdAt);
            const now = moment();
            if (createdAt.isSame(now, 'day')) {
                groups.today.push(thread);
            } else if (createdAt.isSame(now.clone().subtract(1, 'day'), 'day')) {
                groups.yesterday.push(thread);
            } else if (createdAt.isAfter(now.clone().subtract(7, 'days'))) {
                groups.last7Days.push(thread);
            } else if (createdAt.isAfter(now.clone().subtract(30, 'days'))) {
                groups.last30Days.push(thread);
            } else {
                groups.previousMonths.push(thread);
            }
        });
        return groups;
    }, [loadedThreads]);

    const renderGroup = ({
        title,
        threads,
        groupIcon,
        renderEmptyState,
    }: {
        title: string;
        threads: Thread[];
        groupIcon?: React.ReactNode;
        renderEmptyState?: () => React.ReactNode;
    }) => {
        if (threads.length === 0 && !renderEmptyState) return null;
        return (
            <Flex direction="col" items="start" className="w-full gap-0.5">
                <div className="text-muted-foreground/70 flex flex-row items-center gap-1 px-2 py-1 text-xs font-medium opacity-70">
                    {groupIcon}
                    {title}
                </div>
                {threads.length === 0 && renderEmptyState ? (
                    renderEmptyState()
                ) : (
                    <Flex className="border-border/50 w-full gap-0.5" gap="none" direction="col">
                        {threads.map(thread => (
                            <HistoryItem
                                thread={thread}
                                pinThread={() => pinThread(thread.id)}
                                unpinThread={() => unpinThread(thread.id)}
                                isPinned={thread.pinned}
                                key={thread.id}
                                dismiss={() => {
                                    setIsSidebarOpen(prev => false);
                                }}
                                isActive={thread.id === currentThreadId}
                            />
                        ))}
                    </Flex>
                )}
            </Flex>
        );
    };

    return (
        <div
            className={cn(
                'relative bottom-0 left-0 top-0 z-[50] flex h-[100dvh] flex-shrink-0 flex-col  py-2 transition-all duration-200',
                isSidebarOpen ? 'top-0 h-full w-[230px]' : 'w-[50px]'
            )}
        >
            <Flex direction="col" className="w-full flex-1 items-start overflow-hidden">
                <div className="mb-3 flex w-full flex-row items-center justify-between">
                    <Link href="/chat" className="w-full">
                        <div
                            className={cn(
                                'flex h-8 w-full cursor-pointer items-center justify-start gap-1.5 px-4',
                                !isSidebarOpen && 'justify-center px-0'
                            )}
                        >
                            <Logo className="text-brand size-5" />
                            {isSidebarOpen && (
                                <p className="font-clash text-foreground text-lg font-bold tracking-wide">
                                    HyperFix
                                </p>
                            )}
                        </div>
                    </Link>
                    {isSidebarOpen && (
                        <Button
                            variant="ghost"
                            tooltip={t('actions.closeSidebar')}
                            tooltipSide="right"
                            size="icon-sm"
                            aria-label={t('actions.closeSidebar')}
                            onClick={() => setIsSidebarOpen(prev => !prev)}
                            className={cn(!isSidebarOpen && 'mx-auto', 'mr-2')}
                        >
                            <IconArrowBarLeft size={16} strokeWidth={2} />
                        </Button>
                    )}
                </div>
                <Flex
                    direction="col"
                    className={cn(
                        'w-full items-end px-3 ',
                        !isSidebarOpen && 'items-center justify-center px-0'
                    )}
                    gap="xs"
                >
                    {!isChatPage ? (
                        <Link href="/chat" className={isSidebarOpen ? 'w-full' : ''}>
                            <Button
                                size={isSidebarOpen ? 'sm' : 'icon-sm'}
                                variant="bordered"
                                rounded="lg"
                                tooltip={isSidebarOpen ? undefined : t('sidebar.tooltip.newThread')}
                                tooltipSide="right"
                                aria-label={isSidebarOpen ? undefined : t('sidebar.tooltip.newThread')}
                                className={cn(isSidebarOpen && 'relative w-full', 'justify-center')}
                            >
                                <IconPlus size={16} strokeWidth={2} className={cn(isSidebarOpen)} />
                                {isSidebarOpen && t('actions.new')}
                            </Button>
                        </Link>
                    ) : (
                        <Button
                            size={isSidebarOpen ? 'sm' : 'icon-sm'}
                            variant="bordered"
                            rounded="lg"
                            tooltip={isSidebarOpen ? undefined : t('sidebar.tooltip.newThread')}
                            tooltipSide="right"
                            aria-label={isSidebarOpen ? undefined : t('sidebar.tooltip.newThread')}
                            className={cn(isSidebarOpen && 'relative w-full', 'justify-center')}
                        >
                            <IconPlus size={16} strokeWidth={2} className={cn(isSidebarOpen)} />
                            {isSidebarOpen && t('actions.newThread')}
                        </Button>
                    )}
                    <Button
                        size={isSidebarOpen ? 'sm' : 'icon-sm'}
                        variant="bordered"
                        rounded="lg"
                        tooltip={isSidebarOpen ? undefined : t('sidebar.tooltip.search')}
                        tooltipSide="right"
                        aria-label={isSidebarOpen ? undefined : t('sidebar.tooltip.search')}
                        className={cn(
                            isSidebarOpen && 'relative w-full',
                            'text-muted-foreground justify-center px-2'
                        )}
                        onClick={() => setIsCommandSearchOpen(true)}
                    >
                        <IconSearch size={14} strokeWidth={2} className={cn(isSidebarOpen)} />
                        {isSidebarOpen && t('actions.search')}
                        {isSidebarOpen && <div className="flex-1" />}
                        {isSidebarOpen && (
                            <div className="flex flex-row items-center gap-1">
                                <Badge
                                    variant="secondary"
                                    className="bg-muted-foreground/10 text-muted-foreground flex size-5 items-center justify-center rounded-md p-0"
                                >
                                    <IconCommand size={12} strokeWidth={2} className="shrink-0" />
                                </Badge>
                                <Badge
                                    variant="secondary"
                                    className="bg-muted-foreground/10 text-muted-foreground flex size-5 items-center justify-center rounded-md p-0"
                                >
                                    K
                                </Badge>
                            </div>
                        )}
                    </Button>
                </Flex>

                {false ? (
                    <FullPageLoader />
                ) : (
                    <Flex
                        direction="col"
                        gap="md"
                        className={cn(
                            'no-scrollbar w-full flex-1 overflow-y-auto px-3 pb-[100px]',
                            isSidebarOpen ? 'flex' : 'hidden'
                        )}
                    >
                        {renderGroup({
                            title: t('sidebar.pinned.title'),
                            threads: allThreads
                                .filter(thread => thread.pinned)
                                .sort((a, b) => b.pinnedAt.getTime() - a.pinnedAt.getTime()),
                            groupIcon: <IconPinned size={14} strokeWidth={2} />,
                            renderEmptyState: () => (
                                <div className="border-hard flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-2">
                                    <p className="text-muted-foreground text-xs opacity-50">
                                        {t('sidebar.pinned.empty')}
                                    </p>
                                </div>
                            ),
                        })}
                        {renderGroup({ title: t('sidebar.groups.today'), threads: groupedThreads.today })}
                        {renderGroup({ title: t('sidebar.groups.yesterday'), threads: groupedThreads.yesterday })}
                        {renderGroup({ title: t('sidebar.groups.last7Days'), threads: groupedThreads.last7Days })}
                        {renderGroup({ title: t('sidebar.groups.last30Days'), threads: groupedThreads.last30Days })}
                        {renderGroup({
                            title: t('sidebar.groups.previousMonths'),
                            threads: groupedThreads.previousMonths,
                        })}
                        <div ref={sentinelRef} aria-hidden className="h-2" />
                        {isLoading && (
                            <div role="status" aria-live="polite" className="text-center py-2 text-xs text-muted-foreground">
                                Loading...
                            </div>
                        )}
                        {!hasMore && loadedThreads.length > 0 && (
                            <div className="text-center py-2 text-xs text-muted-foreground">—</div>
                        )}
                    </Flex>
                )}

                <Flex
                    className={cn(
                        'from-tertiary via-tertiary/95 absolute bottom-0 mt-auto w-full items-center bg-gradient-to-t via-60% to-transparent p-2 pt-12',
                        isSidebarOpen && 'items-start justify-between'
                    )}
                    gap="xs"
                    direction={'col'}
                >
                    {!isSidebarOpen && (
                        <Button
                            variant="ghost"
                            size="icon"
                            tooltip={t('actions.openSidebar')}
                            tooltipSide="right"
                            aria-label={t('actions.openSidebar')}
                            onClick={() => setIsSidebarOpen(prev => !prev)}
                            className={cn(!isSidebarOpen && 'mx-auto')}
                        >
                            <IconArrowBarRight size={16} strokeWidth={2} />
                        </Button>
                    )}
                    {isSignedIn && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <div
                                    className={cn(
                                        'hover:bg-quaternary bg-background shadow-subtle-xs flex w-full cursor-pointer flex-row items-center gap-3 rounded-lg px-2 py-1.5',
                                        !isSidebarOpen && 'px-1.5'
                                    )}
                                >
                                    <div className="bg-brand flex size-5 shrink-0 items-center justify-center rounded-full">
                                        {user && user.hasImage ? (
                                            <img
                                                src={user?.imageUrl ?? ''}
                                                width={20}
                                                height={20}
                                                loading="lazy"
                                                decoding="async"
                                                className="size-full shrink-0 rounded-full"
                                                alt={user?.fullName ?? ''}
                                            />
                                        ) : (
                                            <IconUser
                                                size={14}
                                                strokeWidth={2}
                                                className="text-background"
                                            />
                                        )}
                                    </div>

                                    {isSidebarOpen && (
                                        <p className="line-clamp-1 flex-1 !text-sm font-medium">
                                            {user?.fullName}
                                        </p>
                                    )}
                                    {isSidebarOpen && (
                                        <IconSelector
                                            size={14}
                                            strokeWidth={2}
                                            className="text-muted-foreground"
                                        />
                                    )}
                                </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
                                    <IconSettings size={16} strokeWidth={2} />
                                    {t('actions.settings')}
                                </DropdownMenuItem>
                                {isSignedIn && (
                                    <DropdownMenuItem onClick={() => openUserProfile()}>
                                        <IconUser size={16} strokeWidth={2} />
                                        {t('actions.profile')}
                                    </DropdownMenuItem>
                                )}
                                {isSignedIn && (
                                    <DropdownMenuItem onClick={() => signOut()}>
                                        <IconLogout size={16} strokeWidth={2} />
                                        {t('actions.signOut')}
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    {isSidebarOpen && !isSignedIn && (
                        <div className="flex w-full flex-col gap-1.5 p-1">
                            <Button
                                variant="bordered"
                                size="sm"
                                rounded="lg"
                                onClick={() => {
                                    setIsSettingsOpen(true);
                                }}
                            >
                                <IconSettings2 size={14} strokeWidth={2} />
                                {t('actions.settings')}
                            </Button>
                            <Button size="sm" rounded="lg" onClick={() => push('/sign-in')}>
                                {t('actions.signIn')}
                            </Button>
                        </div>
                    )}
                </Flex>
            </Flex>
        </div>
    );
};
