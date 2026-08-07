interface Props {
  code: string;
  name: string;
  amount: string;
  fiat?: string;
  icon: string;
  onClick?: () => void;
}

export function BalanceCard({ code, name, amount, fiat, icon, onClick }: Props) {
  return (
    <div className="sh-card sh-balance" onClick={onClick} role={onClick ? 'button' : undefined}>
      <div className="sh-balance-left">
        <span className="sh-balance-icon" aria-hidden>{icon}</span>
        <div className="sh-balance-meta">
          <span className="sh-balance-code">{code}</span>
          <span className="sh-balance-name">{name}</span>
        </div>
      </div>
      <div className="sh-balance-right">
        <span className="sh-balance-amount">{amount}</span>
        {fiat && <span className="sh-balance-fiat">{fiat}</span>}
      </div>
    </div>
  );
}
