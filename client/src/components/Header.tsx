interface Props {
  balance: number;
}

export function Header({ balance }: Props) {
  return (
    <header className="header">
      <div className="header-inner">
        <h1 className="logo">CASE <span>OPENING</span></h1>
        <div className="balance-block">
          <span className="balance-label">Баланс</span>
          <div className="balance-value">
            {balance.toLocaleString('ru-RU')} <span className="coin">●</span>
          </div>
        </div>
      </div>
    </header>
  );
}
