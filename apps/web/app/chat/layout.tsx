import { AnimatedChatInput } from '@repo/common/components';
import ChatBackgroundWrapper from "../../components/chat-background-wrapper";

export default function ChatPageLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { threadId: string };
}) {
    return (
        <div className="chat-theme relative flex h-full w-full flex-col">
            <ChatBackgroundWrapper>
                {children}
            </ChatBackgroundWrapper>
            <AnimatedChatInput />
        </div>
    );
}
