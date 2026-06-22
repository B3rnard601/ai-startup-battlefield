'use client';

import type { GameState } from '@/types/game';

interface Props {
  state: GameState;
}

export default function MetricsDashboard({ state }: Props) {
  const m = state.metrics;
  const fs = m.founderScore;

  return (
    <div className="border-b border-border overflow-y-auto">
      {/* Section header */}
      <div className="border-b border-border px-4 py-2 bg-bg-surface">
        <span className="text-xs text-text-muted tracking-widest">COMMAND CENTER</span>
      </div>

      <div className="p-4 space-y-5">

        {/* Core metrics */}
        <div>
          <p className="text-xs text-text-muted tracking-widest mb-2">FINANCIALS</p>
          <div className="space-y-2">
            <MetricRow label="MRR" value={`$${m.revenue.toLocaleString()}`} type={m.revenue > 0 ? 'up' : 'flat'} />
            <MetricRow label="Cash" value={`$${m.cash.toLocaleString()}`} type={m.cash > 50000 ? 'up' : m.cash < 10000 ? 'down' : 'flat'} />
            <MetricRow label="Burn/mo" value={`$${m.burnRate.toLocaleString()}`} type="flat" />
            <MetricRow
              label="Runway"
              value={`${m.runway} months`}
              type={m.runway > 6 ? 'up' : m.runway < 3 ? 'down' : 'flat'}
            />
          </div>
        </div>

        {/* Growth metrics */}
        <div>
          <p className="text-xs text-text-muted tracking-widest mb-2">TRACTION</p>
          <div className="space-y-2">
            <MetricRow label="Users" value={m.users.toLocaleString()} type={m.users > 0 ? 'up' : 'flat'} />
            <MetricRow label="Valuation" value={m.valuation > 0 ? `$${(m.valuation / 1_000_000).toFixed(1)}M` : '—'} type="flat" />
          </div>
        </div>

        {/* Bar meters */}
        <div>
          <p className="text-xs text-text-muted tracking-widest mb-2">COMPANY HEALTH</p>
          <div className="space-y-3">
            <MeterRow label="Reputation" value={m.reputation} color="#FF8C42" />
            <MeterRow label="Team Morale" value={m.teamMorale} color="#10E8AA" />
          </div>
        </div>

        {/* Founder score */}
        <div>
          <p className="text-xs text-text-muted tracking-widest mb-2">
            FOUNDER SCORE · <span className="text-fire">{state.founderStyle}</span>
          </p>
          <div className="space-y-2">
            <MeterRow label="Leadership" value={fs.leadership} color="#4D9DFF" />
            <MeterRow label="Innovation" value={fs.innovation} color="#B042FF" />
            <MeterRow label="Execution" value={fs.execution} color="#FF8C42" />
            <MeterRow label="Ethics" value={fs.ethics} color="#10E8AA" />
          </div>
        </div>

        {/* Agent roster */}
        <div>
          <p className="text-xs text-text-muted tracking-widest mb-2">ACTIVE AGENTS</p>
          <div className="space-y-1.5">
            {state.agents.investors.slice(0, 1).map((a) => (
              <AgentRow key={a.id} type="investor" name={a.name} opinion={a.opinion} />
            ))}
            {state.agents.competitors.slice(0, 1).map((a) => (
              <AgentRow key={a.id} type="competitor" name={a.name} opinion={a.opinion} />
            ))}
            {state.agents.customers.slice(0, 1).map((a) => (
              <AgentRow key={a.id} type="customer" name={a.name} opinion={a.opinion} />
            ))}
            {state.agents.employees.slice(0, 2).map((a) => (
              <AgentRow key={a.id} type="employee" name={a.name} opinion={a.opinion} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, type }: { label: string; value: string; type: 'up' | 'down' | 'flat' }) {
  const valueClass = type === 'up' ? 'text-growth' : type === 'down' ? 'text-danger' : 'text-text-primary';
  const arrow = type === 'up' ? '↑' : type === 'down' ? '↓' : '';
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-muted text-xs">{label}</span>
      <span className={`text-xs font-medium ${valueClass}`}>
        {arrow && <span className="mr-0.5 text-[10px]">{arrow}</span>}
        {value}
      </span>
    </div>
  );
}

function MeterRow({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-text-muted text-xs">{label}</span>
        <span className="text-xs" style={{ color }}>{pct}</span>
      </div>
      <div className="h-1 bg-bg-elevated w-full">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function AgentRow({ type, name, opinion }: { type: string; name: string; opinion: number }) {
  const colorMap: Record<string, string> = {
    investor: '#FF8C42',
    competitor: '#FF3B4E',
    customer: '#10E8AA',
    employee: '#9BA8C4',
    journalist: '#4D9DFF',
  };
  const color = colorMap[type] ?? '#616880';
  const mood = opinion > 30 ? '◉' : opinion < -30 ? '◎' : '◌';
  const moodColor = opinion > 30 ? '#10E8AA' : opinion < -30 ? '#FF3B4E' : '#616880';

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] shrink-0" style={{ color }}>{type.toUpperCase().slice(0, 4)}</span>
      <span className="text-text-muted text-xs flex-1 truncate">{name}</span>
      <span className="text-[10px]" style={{ color: moodColor }}>{mood}</span>
    </div>
  );
}
