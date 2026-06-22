import OpenAI from 'openai';
import type { AgentType, AgentMemory } from '@/types/game';

// 0G Compute Router is fully OpenAI-compatible — just swap the base URL
const og = new OpenAI({
  baseURL: process.env.OG_ROUTER_URL || 'https://router-api-testnet.integratenetwork.work/v1',
  apiKey: process.env.OG_ROUTER_API_KEY!,
  defaultHeaders: {
    'Content-Type': 'application/json',
  },
  // 0G Router can be slower than OpenAI — increase timeout
  timeout: 60_000,
  maxRetries: 2,
});

// Primary model available on 0G Compute Network
const MODEL = 'zai-org/GLM-5-FP8';

export interface AgentCallOptions {
  agentType: AgentType;
  systemPrompt: string;
  memory: AgentMemory[];
  userMessage: string;
  useThinking?: boolean; // Enable GLM-5 reasoning (costs more tokens)
}

export interface AgentResult {
  content: string;
  thinking?: string;
  cost?: string;
  provider?: string;
}

/**
 * Run a single agent turn through 0G Compute Router.
 * Returns the full response content.
 */
export async function runAgent(options: AgentCallOptions): Promise<AgentResult> {
  const { systemPrompt, memory, userMessage, useThinking = false } = options;

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
    // Disable GLM-5 thinking for most agents to save tokens + latency
    // Enable for investor pitches where depth matters
    ...(!useThinking && {
      // @ts-ignore — 0G Router extension field, not in OpenAI types
      chat_template_kwargs: { enable_thinking: false },
    }),
  });

  const choice = response.choices[0];
  const content = choice.message.content || '';

  // x_0g_trace is a 0G Router extension — not in OpenAI types
  const trace = (response as any).x_0g_trace;

  return {
    content,
    thinking: (choice.message as any).reasoning_content,
    cost: trace?.billing?.total_cost,
    provider: trace?.provider,
  };
}

/**
 * Stream a single agent turn — yields chunks as they arrive from 0G Compute.
 * Use this for the main game action route to get real-time streaming.
 */
export async function* streamAgent(options: AgentCallOptions): AsyncGenerator<string> {
  const { systemPrompt, memory, userMessage, useThinking = false } = options;

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
    // @ts-ignore
    ...(!useThinking && { chat_template_kwargs: { enable_thinking: false } }),
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

/**
 * Quick JSON-mode call to 0G Compute — used for metric calculations.
 * Always returns a parsed object or null on failure.
 */
export async function computeMetrics<T>(prompt: string): Promise<T | null> {
  try {
    const response = await og.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a game engine. Respond ONLY with valid JSON. No markdown, no explanation.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 300,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      // @ts-ignore
      chat_template_kwargs: { enable_thinking: false },
    });

    const raw = response.choices[0].message.content || '{}';
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
