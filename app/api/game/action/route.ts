import type { AgentType, GameState, StreamEvent, MetricsDelta } from '@/types/game';
import { getGameState, updateGameState, getAgentMemory, appendAgentMemory, createSession } from '@/lib/session-memory';
import { streamAgent, computeMetrics } from '@/lib/0g-compute';
import { saveSnapshot, loadSnapshot } from '@/lib/0g-storage';
import { selectReactingAgents, buildGameContext, applyDelta, addEvent, addSnapshot, shouldCheckpoint, isGameOver } from '@/lib/game-engine';
import { buildInvestorPrompt, getInvestorProfile } from '@/lib/agents/investor';
import { buildCompetitorPrompt } from '@/lib/agents/competitor';
import { buildCustomerPrompt } from '@/lib/agents/customer';
import { buildJournalistPrompt, determineSentiment } from '@/lib/agents/journalist';
import { buildEmployeePrompt } from '@/lib/agents/employee';

export const maxDuration = 90;

function send(controller: ReadableStreamDefaultController, event: StreamEvent) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
}

export async function POST(request: Request) {
  const { sessionId, playerAction } = await request.json();

  if (!sessionId || !playerAction?.trim()) {
    return new Response('Missing sessionId or playerAction', { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // ── Load game state ────────────────────────────────────────────────
        let state = getGameState(sessionId);
        if (!state) {
          try {
            state = await loadSnapshot(sessionId);   // sessionId IS the root hash
            createSession(state);
          } catch {
            send(controller, {
              type: 'error',
              message: 'Session not found. Try loading from a snapshot hash.',
            });
            controller.close();
            return;
          }
        }

        // ── Record player decision ─────────────────────────────────────────
        state = addEvent(state, {
          day: state.day,
          actor: 'player',
          content: playerAction,
          eventType: 'decision',
        });

        // ── Determine which agents react ───────────────────────────────────
        const agentTypes = selectReactingAgents(playerAction, state);
        const gameContext = buildGameContext(state);

        // ── Run each agent sequentially (stream tokens in real-time) ───────
        const agentOutputs: Record<string, string> = {};

        for (const agentType of agentTypes) {
          const memory = getAgentMemory(sessionId, agentType);
          let systemPrompt = '';
          let agentName: string = agentType;

          // Build the correct system prompt per agent type
          switch (agentType) {
            case 'investor': {
              const investor = state.agents.investors[0];
              agentName = investor?.name ?? 'Investor';
              const profile = getInvestorProfile(investor?.personality ?? 'conservative');
              systemPrompt = buildInvestorPrompt(profile, gameContext);
              break;
            }
            case 'competitor': {
              const competitor = state.agents.competitors[0];
              agentName = competitor?.name ?? 'Competitor';
              systemPrompt = buildCompetitorPrompt(competitor, gameContext, playerAction);
              break;
            }
            case 'customer': {
              const customer = state.agents.customers[0];
              agentName = customer?.name ?? 'Customer';
              systemPrompt = buildCustomerPrompt(customer, gameContext, playerAction);
              break;
            }
            case 'journalist': {
              agentName = 'TechBeat';
              const sentiment = determineSentiment(state.metrics.reputation, state.day);
              const recentEvents = state.history
                .slice(-5)
                .map((e) => e.content)
                .join('\n');
              systemPrompt = buildJournalistPrompt(gameContext, recentEvents, sentiment);
              break;
            }
            case 'employee': {
              const employee = state.agents.employees[0];
              if (!employee) continue;
              agentName = employee.name;
              systemPrompt = buildEmployeePrompt(employee, gameContext, playerAction);
              break;
            }
            default:
              continue;
          }

          // Signal agent starting
          send(controller, { type: 'agent_start', agent: agentType, agentName });

          // Append player action to this agent's memory
          appendAgentMemory(sessionId, agentType, {
            role: 'user',
            content: playerAction,
          });

          // Stream tokens from 0G Compute
          let fullContent = '';
          try {
            for await (const token of streamAgent({
              agentType,
              systemPrompt,
              memory,
              userMessage: playerAction,
              useThinking: agentType === 'investor' && state.phase === 'fundraising',
            })) {
              fullContent += token;
              send(controller, { type: 'token', agent: agentType, content: token });
            }
          } catch (err) {
            fullContent = `[${agentName} is unavailable — check 0G Compute connection]`;
            send(controller, { type: 'token', agent: agentType, content: fullContent });
          }

          // Append agent response to memory
          appendAgentMemory(sessionId, agentType, {
            role: 'assistant',
            content: fullContent,
          });

          agentOutputs[agentType] = fullContent;

          // Signal agent done
          send(controller, {
            type: 'agent_end',
            agent: agentType,
            agentName,
            full: fullContent,
          });

          // Record in game history
          state = addEvent(state, {
            day: state.day,
            actor: agentType,
            agentType,
            content: fullContent,
            eventType: agentType === 'journalist' ? 'news' : 'response',
          });
        }

        // ── Compute metric delta via 0G Compute ────────────────────────────
        const delta = await computeMetrics<MetricsDelta>(`
You are a startup simulation game engine calculating metric changes.

PLAYER ACTION: "${playerAction}"

AGENT REACTIONS:
${Object.entries(agentOutputs)
  .map(([type, content]) => `${type.toUpperCase()}: ${content}`)
  .join('\n\n')}

CURRENT STATE:
${gameContext}

Based on the action and agent reactions, compute realistic metric changes as JSON:
{
  "revenue": <integer, can be negative>,
  "users": <integer, can be negative>,
  "cash": <integer, negative = money spent>,
  "reputation": <-15 to +15>,
  "teamMorale": <-15 to +15>,
  "leadership": <-5 to +5>,
  "innovation": <-5 to +5>,
  "execution": <-5 to +5>,
  "ethics": <-5 to +5>,
  "founderStyle": "<Visionary|Operator|Hustler|Micromanager|Strategist>"
}

Rules:
- Be conservative. Small changes feel more realistic than big swings.
- Bad decisions should hurt. Good decisions should help. Neutral decisions: minimal change.
- cash negative = money spent on the action (salaries, marketing, etc.)
- Return ONLY valid JSON.
`);

        // ── Apply delta + advance day ──────────────────────────────────────
        state = applyDelta(state, delta ?? {});

        // ── Update session memory ──────────────────────────────────────────
        updateGameState(sessionId, () => state as GameState);

        // ── Send metrics update to client ──────────────────────────────────
        send(controller, {
          type: 'metrics_update',
          metrics: state.metrics,
          delta: delta ?? {},
        });

        // ── Check for game over ────────────────────────────────────────────
        if (isGameOver(state)) {
          send(controller, {
            type: 'game_over',
            outcome: state.phase as 'dead' | 'unicorn' | 'acquired' | 'ipo',
          });
        }

        // ── Checkpoint to 0G Storage every action ─────────────────────────
        if (shouldCheckpoint(state)) {
          try {
            const rootHash = await saveSnapshot(state);
            state = addSnapshot(state, rootHash);
            state.sessionId = rootHash;              // ← this line is the actual fix
            createSession(state);                     // re-key in memory under new hash
            send(controller, { type: 'snapshot_saved', rootHash, day: state.day });
          } catch (err) {
            console.error('[0G Storage] Checkpoint failed:', err);
            // Non-fatal — game continues without checkpoint
          }
        }

        controller.close();
      } catch (err) {
        console.error('[/api/game/action]', err);
        send(controller, {
          type: 'error',
          message: err instanceof Error ? err.message : 'Game engine error',
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
