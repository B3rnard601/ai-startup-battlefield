import { NextResponse } from 'next/server';
import { getGameState, updateGameState } from '@/lib/session-memory';
import { saveSnapshot } from '@/lib/0g-storage';
import { addSnapshot } from '@/lib/game-engine';

export const maxDuration = 30;

export async function POST(request: Request) {
  const { sessionId } = await request.json();

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }

  const state = getGameState(sessionId);
  if (!state) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  try {
    const rootHash = await saveSnapshot(state);
    updateGameState(sessionId, (s) => addSnapshot(s, rootHash));

    return NextResponse.json({
      rootHash,
      day: state.day,
      message: `Game state at Day ${state.day} saved to 0G Storage permanently.`,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: '0G Storage upload failed',
        detail: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
