import { PageHeader } from './PageHeader';
import { SectionHeader } from './SectionHeader';
import { StatCard } from './StatCard';
import { GameCard } from './GameCard';
import { BalanceCard } from './BalanceCard';
import { RewardCard } from './RewardCard';
import { SettingRow } from './SettingRow';
import { EmptyState } from './EmptyState';
import {
  mockStats,
  mockGames,
  mockBalances,
  mockRewards,
  mockSettings,
  mockProfile,
} from './mockData';
import type { NavId } from './navItems';

function DashboardPage() {
  return (
    <div className="sh-page">
      <PageHeader title="Dashboard" subtitle="Welcome back, Mark 👋" />
      <div className="sh-grid sh-grid--stats">
        {mockStats.map((s) => (
          <StatCard key={s.id} label={s.label} value={s.value} delta={s.delta} icon={s.icon} />
        ))}
      </div>
      <SectionHeader title="Popular games" action={<span className="sh-link">See all</span>} />
      <div className="sh-grid sh-grid--games">
        {mockGames.slice(0, 4).map((g) => (
          <GameCard key={g.id} title={g.title} icon={g.icon} subtitle={g.subtitle} hot={g.hot} />
        ))}
      </div>
    </div>
  );
}

function ProfilePage() {
  return (
    <div className="sh-page">
      <PageHeader title="Profile" />
      <div className="sh-card sh-profile">
        <span className="sh-profile-avatar" aria-hidden>{mockProfile.avatar}</span>
        <div className="sh-profile-meta">
          <span className="sh-profile-name">{mockProfile.name}</span>
          <span className="sh-profile-handle">{mockProfile.handle}</span>
          <span className="sh-profile-sub">Level {mockProfile.level} · {mockProfile.joined}</span>
        </div>
      </div>
      <div className="sh-grid sh-grid--stats">
        {mockStats.slice(0, 2).map((s) => (
          <StatCard key={s.id} label={s.label} value={s.value} delta={s.delta} icon={s.icon} />
        ))}
      </div>
    </div>
  );
}

function BalancePage() {
  return (
    <div className="sh-page">
      <PageHeader
        title="Balance"
        subtitle="Total ≈ $60.70"
        action={<button type="button" className="sh-btn sh-btn--primary">Deposit</button>}
      />
      <div className="sh-list">
        {mockBalances.map((b) => (
          <BalanceCard key={b.code} code={b.code} name={b.name} amount={b.amount} fiat={b.fiat} icon={b.icon} />
        ))}
      </div>
    </div>
  );
}

function GamesPage() {
  return (
    <div className="sh-page">
      <PageHeader title="Games" subtitle="Pick your game" />
      <div className="sh-grid sh-grid--games">
        {mockGames.map((g) => (
          <GameCard key={g.id} title={g.title} icon={g.icon} subtitle={g.subtitle} hot={g.hot} />
        ))}
      </div>
    </div>
  );
}

function RewardsPage() {
  return (
    <div className="sh-page">
      <PageHeader title="Rewards" subtitle="Bonuses and quests" />
      <div className="sh-list">
        {mockRewards.map((r) => (
          <RewardCard key={r.id} title={r.title} hint={r.hint} icon={r.icon} status={r.status} />
        ))}
      </div>
      <SectionHeader title="Quests" />
      <EmptyState icon="🧭" title="No active quests" hint="New quests arrive every week." actionLabel="Explore" />
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="sh-page">
      <PageHeader title="Settings" />
      <div className="sh-list sh-list--flush">
        {mockSettings.map((s) => (
          <SettingRow key={s.id} label={s.label} hint={s.hint} kind={s.kind} value={s.value} />
        ))}
      </div>
    </div>
  );
}

export const PAGES: Record<NavId, () => JSX.Element> = {
  dashboard: DashboardPage,
  profile: ProfilePage,
  balance: BalancePage,
  games: GamesPage,
  rewards: RewardsPage,
  settings: SettingsPage,
};
