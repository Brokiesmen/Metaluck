import { useSettings } from '../settings/SettingsContext';
import { ModalShell } from './ModalShell';

interface Props {
  onClose: () => void;
}

export function RulesModal({ onClose }: Props) {
  const { t } = useSettings();
  const r = t.rules;

  const blocks: { title: string; body: string }[] = [
    { title: r.generalTitle, body: r.generalBody },
    { title: r.starsTitle, body: r.starsBody },
    { title: r.casesTitle, body: r.casesBody },
    { title: r.dailyTitle, body: r.dailyBody },
    { title: r.gamesTitle, body: r.gamesIntro },
    { title: r.coinflipTitle, body: r.coinflipBody },
    { title: r.blackjackTitle, body: r.blackjackBody },
    { title: r.minerushTitle, body: r.minerushBody },
    { title: r.arenaTitle, body: r.arenaBody },
    { title: r.aviatorTitle, body: r.aviatorBody },
    { title: r.withdrawTitle, body: r.withdrawBody },
    { title: r.demoTitle, body: r.demoBody },
    { title: r.fairTitle, body: r.fairBody },
  ];

  return (
    <ModalShell onClose={onClose} sheetClassName="rules-sheet" labelledBy="rules-title">
      <div className="modal-handle" />
      <div className="rules-header">
        <div id="rules-title" className="rules-title">{r.title}</div>
        <div className="rules-subtitle">{r.subtitle}</div>
      </div>
      <div className="rules-scroll">
        {blocks.map((b) => (
          <section key={b.title} className="rules-block">
            <h3 className="rules-block-title">{b.title}</h3>
            <p className="rules-block-body">{b.body}</p>
          </section>
        ))}
      </div>
      <button type="button" className="tg-btn modal-action" onClick={onClose}>
        {r.close}
      </button>
    </ModalShell>
  );
}
