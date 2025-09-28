import { NextRequest, NextResponse } from 'next/server';

const BLOCKED_HOSTNAMES = new Set([
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
]);

function isPrivateIPv4(host: string) {
    // Quick check for IPv4
    const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m) return false;
    const [a, b, c, d] = m.slice(1).map(n => parseInt(n, 10));
    if ([a, b, c, d].some(n => Number.isNaN(n) || n < 0 || n > 255)) return true; // treat invalid as blocked

    // 10.0.0.0/8
    if (a === 10) return true;
    // 172.16.0.0/12 -> 172.16.0.0 - 172.31.255.255
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16
    if (a === 192 && b === 168) return true;
    // 169.254.0.0/16 (link-local)
    if (a === 169 && b === 254) return true;
    // Loopback 127.0.0.0/8
    if (a === 127) return true;
    // 0.0.0.0
    if (a === 0) return true;

    return false;
}

function isBlockedTarget(u: URL) {
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return true;
    const host = u.hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.has(host)) return true;
    if (isPrivateIPv4(host)) return true;
    if (host === '::1') return true; // IPv6 loopback
    return false;
}

function extractImageFromHtml(html: string): string | null {
    // naive meta tag search with precedence
    const metas = Array.from(html.matchAll(/<meta[^>]*>/gi)).map(m => m[0]);

    const getAttr = (tag: string, name: string) => {
        const m = tag.match(new RegExp(`${name}=["']([^"']+)["']`, 'i'));
        return m ? m[1].trim() : null;
    };

    const matches: string[] = [];

    for (const tag of metas) {
        const property = getAttr(tag, 'property') || getAttr(tag, 'name');
        const content = getAttr(tag, 'content');
        if (!property || !content) continue;
        const p = property.toLowerCase();
        if (p === 'og:image' || p === 'og:image:url' || p === 'og:image:secure_url') {
            matches.push(content);
        }
    }
    if (matches.length > 0) return matches[0];

    for (const tag of metas) {
        const property = getAttr(tag, 'property') || getAttr(tag, 'name');
        const content = getAttr(tag, 'content');
        if (!property || !content) continue;
        const p = property.toLowerCase();
        if (p === 'twitter:image' || p === 'twitter:image:src') {
            return content;
        }
    }

    return null;
}

export async function GET(req: NextRequest) {
    try {
        const urlParam = req.nextUrl.searchParams.get('url') || '';
        if (!urlParam) {
            return NextResponse.json({ image: null }, { status: 400 });
        }

        let target: URL;
        try {
            target = new URL(urlParam);
        } catch {
            return NextResponse.json({ image: null }, { status: 400 });
        }

        if (isBlockedTarget(target)) {
            return NextResponse.json({ image: null }, { status: 400 });
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        let html = '';
        try {
            const res = await fetch(target.toString(), {
                signal: controller.signal,
                redirect: 'follow',
                headers: {
                    'user-agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
                    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                },
            });

            if (!res.ok) {
                clearTimeout(timeout);
                return NextResponse.json({ image: null }, { status: 200 });
            }

            html = await res.text();
        } catch (e) {
            clearTimeout(timeout);
            return NextResponse.json({ image: null }, { status: 200 });
        } finally {
            clearTimeout(timeout);
        }

        const raw = extractImageFromHtml(html);
        let image: string | null = null;
        if (raw) {
            try {
                const abs = new URL(raw, target).toString();
                if (abs.startsWith('http://') || abs.startsWith('https://')) {
                    image = abs;
                }
            } catch {
                // ignore
            }
        }

        const res = NextResponse.json({ image }, { status: 200 });
        res.headers.set('Cache-Control', 's-maxage=86400, stale-while-revalidate=86400');
        return res;
    } catch (e) {
        return NextResponse.json({ image: null }, { status: 200 });
    }
}
