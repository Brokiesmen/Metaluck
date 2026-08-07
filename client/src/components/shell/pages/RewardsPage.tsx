import { PageHeader } from '../PageHeader';
import { SectionHeader } from '../SectionHeader';
import { RewardCard } from '../RewardCard';
import { EmptyState } from '../EmptyState';
import { mockRewards } from '../mockData';

export function RewardsPage() {
  return (
    <div className="sh-page">
      <PageHeader title="Rewards" subtitle="Bonuses, spins and quests" />

      <SectionHeader title="Available" />
      <div className="sh-list">
        {mockRewards.map((r) => (
          <RewardCard key={r.id} title={r.title} hint={r.hint} icon={r.icon} status={r.status} />
        ))}
      </div>

      <SectionHeader title="Quests" />
      <EmptyState
        icon="🧭"
        title="No active quests"
        hint="New quests arrive every week."
        actionLabel="Explore games"
      />
    </div>
  );
}
