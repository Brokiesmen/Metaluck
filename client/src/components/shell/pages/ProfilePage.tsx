import { PageHeader } from '../PageHeader';
import { SectionHeader } from '../SectionHeader';
import { StatCard } from '../StatCard';
import { EmptyState } from '../EmptyState';
import { mockProfile, mockStats, mockActivity } from '../mockData';

export function ProfilePage() {
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
        <button type="button" className="sh-btn">Edit</button>
      </div>

      <div className="sh-grid sh-grid--stats">
        {mockStats.map((s) => (
          <StatCard key={s.id} label={s.label} value={s.value} delta={s.delta} icon={s.icon} />
        ))}
      </div>

      <SectionHeader title="Recent activity" action={<span className="sh-link">History</span>} />
      {mockActivity.length === 0 ? (
        <EmptyState icon="🎮" title="No games yet" hint="Your bets will show up here." />
      ) : (
        <div className="sh-list sh-list--flush">
          {mockActivity.map((a) => (
            <div key={a.id} className="sh-activity">
              <span className="sh-activity-icon" aria-hidden>{a.icon}</span>
              <div className="sh-activity-meta">
                <span className="sh-activity-game">{a.game}</span>
                <span className="sh-activity-when">{a.when}</span>
              </div>
              <span className={`sh-activity-amount${a.win ? ' sh-activity-amount--win' : ''}`}>
                {a.amount}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
