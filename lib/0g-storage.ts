/**
 * 0G Storage Integration
 * ──────────────────────
 * Game state snapshots are stored on 0G's decentralized Log Layer.
 * Each snapshot is immutable. The root hash is the snapshot's permanent ID.
 *
 * Flow:
 *   saveSnapshot(state) → uploads JSON → returns rootHash
 *   loadSnapshot(rootHash) → downloads file → returns GameState
 *
 * The initial session's rootHash becomes the game's sessionId — a permanent,
 * shareable link to the player's startup journey on decentralized storage.
 */

import type { GameState } from '@/types/game';
import path from 'path';
import os from 'os';
import fs from 'fs';

// Lazy-import the 0G SDK (Node.js only — never runs in browser)
async function getSDK() {
  const { MemData, Indexer } = await import('@0gfoundation/0g-storage-ts-sdk');
  const { ethers } = await import('ethers');
  return { MemData, Indexer, ethers };
}

function getConfig() {
  const rpcUrl = process.env.OG_RPC_URL;
  const indexerRpc = process.env.OG_INDEXER_RPC;
  const privateKey = process.env.OG_PRIVATE_KEY;

  if (!rpcUrl || !indexerRpc || !privateKey) {
    throw new Error(
      '0G Storage not configured. Set OG_RPC_URL, OG_INDEXER_RPC, OG_PRIVATE_KEY in .env'
    );
  }

  return { rpcUrl, indexerRpc, privateKey };
}

/**
 * Save a game state snapshot to 0G Storage Log Layer.
 * Returns the Merkle root hash — save this as the snapshot ID.
 */
export async function saveSnapshot(state: GameState): Promise<string> {
  const { MemData, Indexer, ethers } = await getSDK();
  const { rpcUrl, indexerRpc, privateKey } = getConfig();

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);
  const indexer = new Indexer(indexerRpc);

  // Serialize game state as JSON
  const payload = JSON.stringify(state, null, 2);
  const encoded = new TextEncoder().encode(payload);
  const memData = new MemData(encoded);

  // Required: compute merkle tree before upload
  const [tree, treeErr] = await memData.merkleTree();
  if (treeErr || !tree) {
    throw new Error(`0G Storage: Merkle tree error: ${treeErr}`);
  }

  const rootHash = tree.rootHash() ?? "";
  if (!rootHash) throw new Error("0G Storage: rootHash is null");
  console.log(`[0G Storage] Uploading snapshot — Day ${state.day} — Hash: ${rootHash}`);

  const [tx, uploadErr] = await indexer.upload(memData, rpcUrl, signer);
  if (uploadErr) {
    throw new Error(`0G Storage: Upload failed: ${uploadErr}`);
  }

  console.log(`[0G Storage] ✅ Snapshot saved — Hash: ${rootHash}`);
  return rootHash;
}

/**
 * Load a game state from 0G Storage by root hash.
 * Downloads to a temp file, parses JSON, returns GameState.
 */
export async function loadSnapshot(rootHash: string): Promise<GameState> {
  const { Indexer } = await getSDK();
  const { indexerRpc } = getConfig();

  const indexer = new Indexer(indexerRpc);
  const tmpPath = path.join(os.tmpdir(), `asb-${rootHash.slice(0, 16)}.json`);

  console.log(`[0G Storage] Downloading snapshot — Hash: ${rootHash}`);

  // withProof = true enables Merkle proof verification
  const err = await indexer.download(rootHash, tmpPath, true);
  if (err) {
    throw new Error(`0G Storage: Download failed: ${err}`);
  }

  const raw = fs.readFileSync(tmpPath, 'utf-8');
  fs.unlinkSync(tmpPath); // cleanup temp file

  console.log(`[0G Storage] ✅ Snapshot loaded — Hash: ${rootHash}`);
  return JSON.parse(raw) as GameState;
}

/**
 * Check if 0G Storage is configured and reachable.
 * Used on startup to show connection status in the UI.
 */
export async function checkStorageConnection(): Promise<{
  connected: boolean;
  error?: string;
}> {
  try {
    getConfig();
    return { connected: true };
  } catch (err) {
    return {
      connected: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
