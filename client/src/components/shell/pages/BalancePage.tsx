import { PageHeader } from '../PageHeader';
import { SectionHeader } from '../SectionHeader';
import { BalanceCard } from '../BalanceCard';
import { mockBalances } from '../mockData';

export function BalancePage() {
  return (
    <div className="sh-page">
      <PageHeader title="Balance" subtitle="Manage your funds" />

      <section className="sh-hero sh-hero--balance">
        <div className="sh-hero-text">
          <span className="sh-hero-kicker">Total balance</span>
          <h2 className="sh-hero-title sh-hero-title--amount">≈ $60.70</h2>
          <div className="sh-hero-actions">
            <button type="button" className="sh-btn sh-btn--primary">Deposit</button>
            <button type="button" className="sh-btn">Withdraw</button>
          </div>
        </div>
      </section>

      <SectionHeader title="Assets" />
      <div className="sh-list">
        {mockBalances.map((b) => (
          <BalanceCard key={b.code} code={b.code} name={b.name} amount={b.amount} fiat={b.fiat} icon={b.icon} />
        ))}
      </div>
    </div>
  );
}
