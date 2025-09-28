'use client';

import * as Sentry from '@sentry/nextjs';
import Error from 'next/error';
import { useEffect } from 'react';

export default function GlobalError({ error }: { error: Error }) {
    useEffect(() => {
        if (process.env.NODE_ENV === 'production') {
            Sentry.captureException(error);
        }
    }, [error]);

    return (
        <html>
            <body>
                <div className="flex h-screen w-screen flex-col items-center justify-center bg-emerald-50">
                    <div className="flex w-[300px] flex-col gap-2">
                        <p className="text-base">Une erreur est survenue.</p>
                        <p className="text-brand text-sm">
                            Actualisez la page et réessayez. Si le problème persiste, contactez l’équipe :{' '}
                            <a href="mailto:hello@hyper-fix.vercel.app">hello@hyper-fix.vercel.app</a>.
                        </p>
                    </div>
                </div>
            </body>
        </html>
    );
}
