import { NextResponse } from 'next/server';
import { loadSnapshot } from '@/lib/0g-storage';
import { createSession, getGameState } from '@/lib/session-memory';

export const maxDuration = 30;

export async function GET(
  _request: Request,
  { params }: { params: { hash: string } }
) {
  const { hash } = params;

  if (!hash) {
    return NextResponse.json({ error: 'Hash is required' }, { status: 400 });
  }

  // Check in-memory first (fastest path — avoids 0G Storage download)
  const cached = getGameState(hash);
  if (cached) {
    return NextResponse.json({ gameState: cached, source: 'memory' });
  }

  // Not in memory — fetch from 0G Storage (decentralized retrieval)
  try {
    const gameState = await loadSnapshot(hash);

    // Re-hydrate into session memory so subsequent actions are fast
    createSession(gameState);

    return NextResponse.json({
      gameState,
      source: '0g-storage',
      message: `Game state loaded from 0G Storage. Root hash: ${hash}`,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Could not load game state from 0G Storage',
        detail: err instanceof Error ? err.message : 'Unknown error',
        hint: 'Make sure OG_RPC_URL and OG_INDEXER_RPC are configured correctly.',
      },
      { status: 404 }
    );
  }
}
