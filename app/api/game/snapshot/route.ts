import { NextResponse } from 'next/server';
import { getGameState, updateGameState, createSession } from '@/lib/session-memory';
import { saveSnapshot, loadSnapshot } from '@/lib/0g-storage';
import { addSnapshot } from '@/lib/game-engine';

export const maxDuration = 30;

export async function POST(request: Request) {
  const { sessionId } = await request.json();

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }

  // Memory first, 0G Storage fallback
  let state = getGameState(sessionId);
  if (!state) {
    try {
      state = await loadSnapshot(sessionId);
      createSession(state);
    } catch {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
  }

  try {
    const rootHash = await saveSnapshot(state);
    state = addSnapshot(state, rootHash);
    state.sessionId = rootHash; // advance pointer
    createSession(state);       // register under new hash
    updateGameState(sessionId, () => state!);

    return NextResponse.json({
      rootHash,
      day: state.day,
      message: `Day ${state.day} saved to 0G Storage.`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: '0G Storage upload failed', detail: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}
