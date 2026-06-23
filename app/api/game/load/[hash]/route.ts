import { NextResponse } from 'next/server';
import { loadSnapshot } from '@/lib/0g-storage';
import { createSession, getGameState } from '@/lib/session-memory';

export const maxDuration = 30;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ hash: string }> }
) {
  // Next.js 15: params is a Promise — must await
  const { hash } = await params;

  if (!hash) {
    return NextResponse.json({ error: 'Hash is required' }, { status: 400 });
  }

  // Check in-memory first (fastest path)
  const cached = getGameState(hash);
  if (cached) {
    return NextResponse.json({ gameState: cached, source: 'memory' });
  }

  // Fetch from 0G Storage by root hash
  try {
    const gameState = await loadSnapshot(hash);
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
