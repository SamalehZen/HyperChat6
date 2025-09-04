import { AnimatedChatInput } from '@repo/common/components';

export default function ChatPageLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { threadId: string };
}) {
    return (
        <div className="chat-theme relative flex h-full w-full flex-col">
            {children}
            <AnimatedChatInput />
        </div>
    );
}
