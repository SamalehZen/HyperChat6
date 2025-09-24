import { AuthProvider } from '@repo/common/context';
import { RootLayout } from '@repo/common/components';
import { ReactQueryProvider, RootProvider } from '@repo/common/context';
import { TooltipProvider, cn } from '@repo/ui';
import { GeistMono } from 'geist/font/mono';
import type { Viewport } from 'next';
import { Metadata } from 'next';
import { Bricolage_Grotesque } from 'next/font/google';
import localFont from 'next/font/local';

const bricolage = Bricolage_Grotesque({
    subsets: ['latin'],
    variable: '--font-bricolage',
});

import './globals.css';
import { ThemeProvider } from 'next-themes';
import { I18nProvider } from '@repo/common/i18n';
import { OnlineHeartbeat } from '@repo/common/components';

export const metadata: Metadata = {
    title: 'HyperFix - développé pour L\'Hyper',
    description:
        'HyperFix, développé pour Hyper, est une intelligence artificielle polyvalente. Elle corrige les libellés, classe et structure les données, révise les prix et apprend en continu pour toujours mieux vous aider — et bien plus encore.',
    keywords: 'AI chat, hyper, hyperfix, LLM, language models, privacy, minimal UI, ollama, chatgpt',
    authors: [{ name: 'Trendy design', url: 'https://samaleh.com' }],
    creator: 'Arka design',
    publisher: 'Arka design',
    openGraph: {
        title:'HyperFix - développé pour L\'Hyper',
        siteName: 'hyper-fix.vercel.app',
        description:
            'HyperFix, développé pour Hyper, est une intelligence artificielle polyvalente. Elle corrige les libellés, classe et structure les données, révise les prix et apprend en continu pour toujours mieux vous aider — et bien plus encore.',
        url: 'https://hyperfix.vercel.app',
        type: 'website',
        locale: 'fr_FR',
        images: [
            {
                url: 'https://hyper-fix.vercel.app/og-image.jpg',
                width: 1200,
                height: 630,
                alt: 'hyperfix Preview',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'HyperFix - développé pour L\'Hyper',
        site: 'hyperfix.vercel.app',
        creator: '@hyperfix_app',
        description:
            'HyperFix, développé pour Hyper, est une intelligence artificielle polyvalente. Elle corrige les libellés, classe et structure les données, révise les prix et apprend en continu pour toujours mieux vous aider — et bien plus encore.',
        images: ['https://hyperfix.vercel.app/twitter-image.jpg'],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    alternates: {
        canonical: 'https://hyperfix.vercel.app',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

const inter = localFont({
    src: './InterVariable.woff2',
    variable: '--font-inter',
});

const clash = localFont({
    src: './ClashGrotesk-Variable.woff2',
    variable: '--font-clash',
});

export default function ParentLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className={cn(GeistMono.variable, inter.variable, clash.variable, bricolage.variable)}
            suppressHydrationWarning
        >
            <head>
                <link rel="icon" href="/favicon.ico" sizes="any" />

                {/* <script
                    crossOrigin="anonymous"
                    src="//unpkg.com/react-scan/dist/auto.global.js"
                ></script> */}
            </head>
            <body>
                <AuthProvider>
                    <RootProvider>
                        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange={false}>
                            <TooltipProvider>
                                <I18nProvider>
                                    <ReactQueryProvider>
                                        <RootLayout>{children}</RootLayout>
                                        <OnlineHeartbeat />
                                    </ReactQueryProvider>
                                </I18nProvider>
                            </TooltipProvider>
                        </ThemeProvider>
                    </RootProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
