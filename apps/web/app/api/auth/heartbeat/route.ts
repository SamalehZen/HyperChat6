import { NextRequest } from 'next/server';
import { getSession, updateHeartbeat } from '../../_lib/auth';

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (session) {
    try {
      await updateHeartbeat(request, session.token);
    } catch {}
  }
  return new Response(null, { status: 204 });
}
