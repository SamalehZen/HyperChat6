import { fontFamily } from 'tailwindcss/defaultTheme';

const config: any = {
    darkMode: ['class'],
    theme: {
        container: {
            center: true,
            padding: '2rem',
            screens: {
                '2xl': '1400px',
            },
        },
        extend: {
            colors: {
                border: 'hsl(var(--border))',
                soft: 'hsl(var(--soft))',
                hard: 'hsl(var(--hard))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                brand: {
                    DEFAULT: 'hsl(var(--brand))',
                    foreground: 'hsl(var(--brand-foreground))',
                },
                tertiary: {
                    DEFAULT: 'hsl(var(--tertiary))',
                    foreground: 'hsl(var(--tertiary-foreground))',
                },
                quaternary: {
                    DEFAULT: 'hsl(var(--quaternary))',
                    foreground: 'hsl(var(--quaternary-foreground))',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
            },
            borderWidth: {
                DEFAULT: '0.8px',
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
            fontFamily: {
                mono: ['var(--font-geist-mono)', ...fontFamily.mono],
                clash: ['var(--font-clash)', ...fontFamily.sans],
                sans: ['var(--font-inter)', ...fontFamily.sans],
                bricolage: ['var(--font-bricolage)', ...fontFamily.sans],
            },
            fontSize: {
                xs: [
                    'clamp(0.9rem, calc(0.9rem + 1.8px * ((100vw - 360px) / 920)), 1.0125rem)',
                    { lineHeight: '1.2rem', letterSpacing: '0.01em' }
                ],
                sm: [
                    'clamp(0.95rem, calc(0.95rem + 1.9px * ((100vw - 360px) / 920)), 1.06875rem)',
                    { lineHeight: '1.35rem', letterSpacing: '0.008em' }
                ],
                base: [
                    'clamp(1rem, calc(1rem + 2px * ((100vw - 360px) / 920)), 1.125rem)',
                    { lineHeight: '1.5rem' }
                ],
                lg: [
                    'clamp(1.125rem, calc(1.125rem + 2.25px * ((100vw - 360px) / 920)), 1.265625rem)',
                    { lineHeight: '1.75rem' }
                ],
                xl: [
                    'clamp(1.333rem, calc(1.333rem + 2.666px * ((100vw - 360px) / 920)), 1.499625rem)',
                    { lineHeight: '1.95rem' }
                ],
                '2xl': [
                    'clamp(1.8rem, calc(1.8rem + 3.2px * ((100vw - 360px) / 920)), 2rem)',
                    { lineHeight: '2.25rem' }
                ],
                '3xl': [
                    'clamp(2.25rem, calc(2.25rem + 4px * ((100vw - 360px) / 920)), 2.5rem)',
                    { lineHeight: '2.5rem' }
                ],
                '4xl': [
                    'clamp(2.8rem, calc(2.8rem + 6.4px * ((100vw - 360px) / 920)), 3.2rem)',
                    { lineHeight: '2.75rem' }
                ],
                '5xl': [
                    'clamp(3.5rem, calc(3.5rem + 8px * ((100vw - 360px) / 920)), 4rem)',
                    { lineHeight: '1' }
                ],
            ],
            fontWeight: {
                normal: '350',
                medium: '400',
                semibold: '450',
                bold: '500',
                black: '600',
            },
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' },
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' },
                },
                marquee: {
                    '0%': { transform: 'translateX(0%)' },
                    '100%': { transform: 'translateX(-100%)' },
                },
                marquee2: {
                    '0%': { transform: 'translateX(100%)' },
                    '100%': { transform: 'translateX(0%)' },
                },
                'fade-in-once': {
                    '0%': { opacity: 0, transform: 'translateY(5px)' },
                    '100%': { opacity: 1, transform: 'translateY(0)' },
                },
                'reveal-pop': {
                    '0%': { opacity: 0, transform: 'scale(0.96) translateY(10px)' },
                    '70%': { opacity: 1, transform: 'scale(1.01) translateY(-2px)' },
                    '100%': { opacity: 1, transform: 'scale(1) translateY(0)' },
                },
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'fade-in-once': 'fade-in-once 10s ease-out forwards',
                'reveal-pop': 'reveal-pop 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            },
            typography: ({ theme }) => ({
                prosetheme: {
                    css: {
                        '--tw-prose-body': 'hsl(var(--foreground))',
                        '--tw-prose-headings': 'hsl(var(--foreground))',
                        '--tw-prose-lead': 'hsl(var(--muted-foreground))',
                        '--tw-prose-links': 'hsl(var(--brand))',
                        '--tw-prose-bold': 'hsl(var(--foreground))',
                        '--tw-prose-counters': 'hsl(var(--muted-foreground)/0.1)',
                        '--tw-prose-bullets': 'hsl(var(--muted-foreground)/0.1)',
                        '--tw-prose-hr': 'hsl(var(--border))',
                        '--tw-prose-quotes': 'hsl(var(--foreground))',
                        '--tw-prose-quote-borders': 'hsl(var(--border))',
                        '--tw-prose-captions': 'hsl(var(--muted-foreground))',
                        '--tw-prose-code': 'hsl(var(--foreground))',
                        '--tw-prose-pre-code': 'hsl(var(--muted-foreground))',
                        '--tw-prose-pre-bg': 'hsl(var(--muted))',
                        '--tw-prose-th-borders': 'hsl(var(--border))',
                        '--tw-prose-td-borders': 'hsl(var(--border))',

                        // Headings & text scale
                        h1: {
                            fontWeight: '600',
                            fontSize: theme('fontSize.3xl')[0],
                            lineHeight: '1.2',
                        },
                        h2: {
                            fontWeight: '600',
                            fontSize: theme('fontSize.2xl')[0],
                            lineHeight: '1.25',
                        },
                        h3: {
                            fontWeight: '600',
                            fontSize: theme('fontSize.xl')[0],
                            lineHeight: '1.3',
                        },
                        p: {
                            fontSize: theme('fontSize.base')[0],
                            lineHeight: '1.65',
                        },
                        'ul, ol': {
                            fontSize: theme('fontSize.base')[0],
                            lineHeight: '1.65',
                        },

                        // Dark mode values
                        '--tw-prose-invert-body': 'hsl(var(--foreground))',
                        '--tw-prose-invert-headings': 'hsl(var(--foreground))',
                        '--tw-prose-invert-lead': 'hsl(var(--muted-foreground))',
                        '--tw-prose-invert-links': 'hsl(var(--brand))',
                        '--tw-prose-invert-bold': 'hsl(var(--foreground))',
                        '--tw-prose-invert-counters': 'hsl(var(--muted-foreground))',
                        '--tw-prose-invert-bullets': 'hsl(var(--muted-foreground))',
                        '--tw-prose-invert-hr': 'hsl(var(--border))',
                        '--tw-prose-invert-quotes': 'hsl(var(--foreground))',
                        '--tw-prose-invert-quote-borders': 'hsl(var(--border))',
                        '--tw-prose-invert-captions': 'hsl(var(--muted-foreground))',
                        '--tw-prose-invert-code': 'hsl(var(--foreground))',
                        '--tw-prose-invert-pre-code': 'hsl(var(--muted-foreground))',
                        '--tw-prose-invert-pre-bg': 'hsl(var(--muted))',
                        '--tw-prose-invert-th-borders': 'hsl(var(--border))',
                        '--tw-prose-invert-td-borders': 'hsl(var(--border))',
                    },
                },
            }),
            boxShadow: {
                'subtle-xs': 'var(--shadow-subtle-xs)',
                'subtle-sm': 'var(--shadow-subtle-sm)',
            },
        },
    },

    plugins: [
        require('@tailwindcss/typography'),
        require('tailwindcss-animate'),
        require('tailwind-scrollbar-hide'),
    ],
};

export default config;
