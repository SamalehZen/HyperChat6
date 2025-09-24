import { getSession } from '../_lib/auth';
import { prisma } from '@repo/prisma';
import { geolocation } from '@vercel/functions';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    const session = await getSession(request);
    const userId = session?.userId;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { feedback } = await request.json();

    await prisma.feedback.create({
        data: {
            userId,
            feedback,
            metadata: JSON.stringify({
                geo: geolocation(request),
            }),
        },
    });

    return NextResponse.json({ message: 'Feedback received' }, { status: 200 });
}
