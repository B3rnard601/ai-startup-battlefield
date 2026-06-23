import OpenAI from 'openai';
import type { AgentType, AgentMemory } from '@/types/game';

/**
 * 0G Compute Router — primary inference provider.
 * Falls back to Groq if OG_ROUTER_API_KEY is missing or balance is empty.
 *
 * To use Groq as fallback:
 *   Set AI_PROVIDER=groq and GROQ_API_KEY=gsk_... in .env
 *   Get a free key at https://console.groq.com
 */

const useGroq = process.env.AI_PROVIDER === 'groq' || !process.env.OG_ROUTER_API_KEY;

const og = new OpenAI(
  useGroq
    ? {
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY!,
        timeout: 30_000,
        maxRetries: 2,
      }
    : {
        baseURL: process.env.OG_ROUTER_URL || 'https://router-api-testnet.integratenetwork.work/v1',
        apiKey: process.env.OG_ROUTER_API_KEY!,
        timeout: 60_000,
        maxRetries: 2,
      }
);

// 0G testnet: 'qwen2.5-omni'  |  Groq fallback: 'llama-3.3-70b-versatile'
const MODEL = useGroq ? 'llama-3.3-70b-versatile' : 'qwen2.5-omni';

export const ACTIVE_PROVIDER = useGroq ? 'Groq (fallback)' : '0G Compute';

console.log(`[AI] Using provider: ${ACTIVE_PROVIDER} — model: ${MODEL}`);

export interface AgentCallOptions {
  agentType: AgentType;
  systemPrompt: string;
  memory: AgentMemory[];
  userMessage: string;
  useThinking?: boolean;
}

export interface AgentResult {
  content: string;
  cost?: string;
  provider?: string;
}

/**
 * Run a single agent turn.
 */
export async function runAgent(options: AgentCallOptions): Promise<AgentResult> {
  const { systemPrompt, memory, userMessage } = options;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...memory.slice(-10).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  const response = await og.chat.completions.create({
    model: MODEL,
    messages,
    max_tokens: 400,
    temperature: 0.85,
  });

  const content = response.choices[0].message.content || '';
  const trace = (response as any).x_0g_trace;

  return {
    content,
    cost: trace?.billing?.total_cost,
    provider: ACTIVE_PROVIDER,
  };
}

/**
 * Stream a single agent turn — yields tokens as they arrive.
 */
export async function* streamAgent(options: AgentCallOptions): AsyncGenerator<string> {
  const { systemPrompt, memory, userMessage } = options;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...memory.slice(-10).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  const stream = await og.chat.completions.create({
    model: MODEL,
    messages,
    max_tokens: 400,
    temperature: 0.85,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

/**
 * JSON-mode call — used for world generation and metric calculations.
 */
export async function computeMetrics<T>(prompt: string): Promise<T | null> {
  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content:
          'You are a game engine. Respond ONLY with valid JSON. No markdown, no explanation, no code fences.',
      },
      { role: 'user', content: prompt },
    ];

    const response = await og.chat.completions.create({
      model: MODEL,
      messages,
      max_tokens: 600,
      temperature: 0.3,
      // json_object mode: supported by both 0G qwen2.5-omni and Groq llama
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0].message.content || '{}';
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean) as T;
  } catch (err) {
    console.error('[AI Compute] computeMetrics failed:', err);
    return null;
  }
}
