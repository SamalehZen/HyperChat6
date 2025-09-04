import * as Sentry from '@sentry/nextjs';

export async function register() {
    Sentry.init({
        dsn: 'https://6d36ec27b0ea6262fd78c5cc8f5e94ca@o4504080709648384.ingest.us.sentry.io/4507756300533760',

        // Adjust this value in production, or use tracesSampler for greater control
        tracesSampleRate: 1,

        // Setting this option to true will print useful information to the console while you're setting up Sentry.
        debug: false,

        // Uncomment the line below to enable Spotlight (https://spotlightjs.com)
        // spotlight: process.env.NODE_ENV === 'development',
    });
}
