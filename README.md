# AI Startup Battlefield

> Build a startup. Survive the market. Convince the investors. Don't go bankrupt.

A live AI startup simulation powered by **0G Compute** (multi-agent AI) and **0G Storage** (decentralized game state persistence). No scripted outcomes. Every agent is real. Every story is generated live.

---

## 0G Integration

| Feature | 0G Service | How |
|---|---|---|
| All AI agents (Investor, Competitor, Customer, Journalist, Employee) | **0G Compute Router** | OpenAI-compatible API swap via `baseURL` |
| Game state snapshots | **0G Storage (Log Layer)** | MemData upload → root hash = session ID |
| Load past games | **0G Storage** | Download by root hash with Merkle proof |

### Why 0G?

- **0G Compute Router**: Every agent response is inference on the decentralized 0G GPU network. The root hash in the URL bar is your game's permanent address on decentralized storage.
- **0G Storage Log Layer**: Game state is immutable and permanently stored. Share the URL — anyone can replay your startup journey. The session ID *is* the Merkle root hash.
- **Auto-checkpointing**: Every 5 in-game days, state is saved to 0G Storage automatically. Manual save available anytime.

---

## Setup

### 1. Clone & install

```bash
git clone <repo>
cd ai-startup-battlefield
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

```env
# 0G Compute Router — get API key at https://pc.testnet.0g.ai
OG_ROUTER_URL=https://router-api-testnet.integratenetwork.work/v1
OG_ROUTER_API_KEY=sk-your-key-here

# 0G Chain (Galileo Testnet)
OG_RPC_URL=https://evmrpc-testnet.0g.ai
OG_INDEXER_RPC=https://indexer-storage-testnet-turbo.0g.ai

# Funded wallet — get tokens at https://faucet.0g.ai (0.1 0G/day)
OG_PRIVATE_KEY=0x_your_private_key
```

### 3. Get testnet tokens

1. Go to https://faucet.0g.ai → request 0G tokens (needed for storage uploads)
2. Go to https://pc.testnet.0g.ai → deposit 0G tokens → create API key with `inference` permission

### 4. Run

```bash
npm run dev
# → http://localhost:3000
```

---

## How It Works

### Starting a game

1. Enter any startup idea on the landing page
2. `POST /api/game/start` calls **0G Compute Router** to:
   - Generate startup name, sector, market size
   - Create 2 realistic competitors + 2 customer personas
   - Get the first investor reaction (streaming)
3. Initial state is uploaded to **0G Storage** → root hash becomes the session ID
4. You're redirected to `/game/{rootHash}`

### Playing

Each player action triggers `POST /api/game/action` which:
1. Selects which agents react (based on action content + game phase)
2. Streams each agent response token-by-token from **0G Compute**
3. Computes metric changes via a separate **0G Compute** call (JSON mode)
4. Auto-saves to **0G Storage** every 5 days

### Loading saved games

Any session can be reloaded from its root hash:
- Share the URL → anyone can watch your game state
- Root hash in URL → game fetches from 0G Storage if not in memory
- `GET /api/game/load/{rootHash}` downloads + re-hydrates the session

---

## Architecture

```
app/
├── page.tsx                   — Landing page (idea input)
├── game/[sessionId]/page.tsx  — Main game UI (streaming terminal)
└── api/game/
    ├── start/route.ts         — Init world via 0G Compute, save to 0G Storage
    ├── action/route.ts        — SSE stream: agents → metrics → checkpoint
    ├── snapshot/route.ts      — Manual save to 0G Storage
    └── load/[hash]/route.ts   — Load game from 0G Storage by root hash

lib/
├── 0g-compute.ts              — 0G Router client (runAgent, streamAgent, computeMetrics)
├── 0g-storage.ts              — saveSnapshot, loadSnapshot
├── session-memory.ts          — In-memory session store (agent memory, game state)
├── game-engine.ts             — State machine, metric updates, phase transitions
└── agents/
    ├── investor.ts            — System prompts + profiles
    ├── competitor.ts
    ├── customer.ts
    ├── journalist.ts
    └── employee.ts
```

---

## Demo Script (2 min for judges)

1. **Enter idea** → watch 0G Compute generate the world in real-time (streaming)
2. **Type a decision** → see 3 agents react simultaneously, streamed token by token
3. **Day 35** → Journalist publishes a headline live
4. **Show the URL bar** → "This root hash is your game's permanent address on 0G Storage"
5. **Open in new tab** → game reloads from 0G Storage — state fully restored
6. **Save button** → "Manually checkpoint to 0G Storage anytime"

---

## Built With

- **Next.js 14** (App Router, streaming API routes)
- **0G Compute Router** — decentralized AI inference
- **0G Storage SDK** — decentralized game state persistence
- **TypeScript + Tailwind CSS**
- Model: `zai-org/GLM-5-FP8` via 0G Compute Network
