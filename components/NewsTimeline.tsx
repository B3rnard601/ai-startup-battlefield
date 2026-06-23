'use client';

import type { GameEvent, SnapshotRecord } from '@/types/game';

interface Props {
  events: GameEvent[];
  snapshots: SnapshotRecord[];
  sessionId: string;
}

export default function NewsTimeline({ events, snapshots, sessionId }: Props) {
  const recentNews = events.slice(-8).reverse();

  function parseHeadline(content: string): { headline: string; story: string } {
    const headlineMatch = content.match(/HEADLINE:[^"]*"?([^"\n]+)"?/i);
    const storyIdx = content.indexOf('STORY:');
    const story = storyIdx >= 0 ? content.slice(storyIdx + 6).trim().split('\n')[0] : '';
    return {
      headline: headlineMatch?.[1]?.trim() ?? content.slice(0, 60),
      story,
    };
  }

  return (
    <div className="flex flex-col overflow-hidden flex-1">

      {/* ── News Feed ──────────────────────────────────────────────────── */}
      <div className="border-b border-border px-4 py-2 bg-bg-surface shrink-0">
        <span className="text-xs text-text-muted tracking-widest">NEWS FEED</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {recentNews.length === 0 ? (
          <p className="text-text-muted text-xs">No press coverage yet. Make some noise.</p>
        ) : (
          recentNews.map((event) => {
            const { headline, story } = parseHeadline(event.content);
            return (
              <div key={event.id} className="border-l-2 border-info pl-3 space-y-0.5 terminal-line">
                <p className="text-text-muted text-[10px] tracking-widest">
                  DAY {event.day}
                </p>
                <p className="text-text-primary text-xs font-medium leading-snug">
                  "{headline}"
                </p>
                {story && (
                  <p className="text-text-muted text-[11px] leading-relaxed">{story}</p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── 0G Snapshots ───────────────────────────────────────────────── */}
      <div className="border-t border-border shrink-0">
        <div className="border-b border-border px-4 py-2 bg-bg-surface">
          <span className="text-xs text-text-muted tracking-widest">
            0G STORAGE · SNAPSHOTS
          </span>
        </div>

        <div className="p-4 space-y-2">
          {snapshots.length === 0 ? (
            <p className="text-text-muted text-xs">
              No snapshots yet. Game auto-saves every 5 days.
            </p>
          ) : (
            snapshots.slice(-4).reverse().map((snap) => (
              <div
                key={snap.rootHash}
                className="flex items-center gap-2 group"
                title={snap.rootHash}
              >
                <span className="text-growth text-[10px] shrink-0">◎</span>
                <div className="flex-1 min-w-0">
                  <p className="text-text-muted text-[10px]">{snap.label}</p>
                  <p className="text-[10px] text-text-muted truncate font-mono opacity-60 group-hover:opacity-100 transition-opacity">
                    {snap.rootHash.slice(0, 24)}...
                  </p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(snap.rootHash);
                  }}
                  className="text-[10px] text-text-muted hover:text-growth transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                  title="Copy root hash"
                >
                  copy
                </button>
              </div>
            ))
          )}

          {/* Session ID / shareable link */}
          <div className="border-t border-border pt-3 mt-2">
            <p className="text-text-muted text-[10px] mb-1">SESSION HASH</p>
            <div
              className="text-[10px] text-growth font-mono cursor-pointer hover:text-text-primary transition-colors break-all"
              title="Click to copy shareable link"
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/game/${sessionId}`
                );
              }}
            >
              {sessionId.slice(0, 32)}...
              <span className="text-text-muted ml-1">[copy link]</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
