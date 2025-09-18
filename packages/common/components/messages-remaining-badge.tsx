import { useUser } from '@clerk/nextjs';
import { useApiKeysStore, useAppStore, useChatStore } from '@repo/common/store';
import { useI18n } from '@repo/common/i18n';

export function MessagesRemainingBadge() {
    const { user } = useUser();
    const chatMode = useChatStore(state => state.chatMode);
    const hasApiKeys = useApiKeysStore(state => state.hasApiKeyForChatMode(chatMode));
    const creditLimit = useChatStore(state => state.creditLimit);
    const setIsSettingsOpen = useAppStore(state => state.setIsSettingsOpen);
    const setSettingTab = useAppStore(state => state.setSettingTab);
    const { t } = useI18n();

    if (
        !creditLimit.isFetched ||
        !user ||
        (creditLimit?.remaining && creditLimit?.remaining > 5) ||
        hasApiKeys
    ) {
        return null;
    }

    return (
        <div className="relative flex w-full items-center justify-center px-3">
            <div className="border-border bg-tertiary/70 -mt-2 flex h-10  w-full flex-row items-center gap-2 rounded-b-xl border-x border-b px-3 pt-2 font-medium">
                <div className="text-muted-foreground/50 text-xs">
                    {creditLimit.remaining === 0
                        ? t('messages.remaining.none')
                        : t('messages.remaining.some', { count: creditLimit.remaining })}{' '}
                    <span
                        className="inline-flex shrink-0 cursor-pointer flex-row items-center gap-1 pl-1 font-medium "
                        onClick={() => {
                            setIsSettingsOpen(true);
                            setSettingTab('api-keys');
                        }}
                    >
                        <span className="text-muted-foreground inline-flex flex-row items-center gap-1 px-1 underline underline-offset-2">
                            {t('messages.remaining.addApiKey')}
                        </span>
                    </span>
                </div>
            </div>
        </div>
    );
}
