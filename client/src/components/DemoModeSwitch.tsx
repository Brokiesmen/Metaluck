import { useSettings } from '../settings/SettingsContext';

interface Props {
  isDemo: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
  /** Compact row under cases header. */
  compact?: boolean;
}

/** Ползунок демо-режима — можно попробовать кейсы без списания баланса. */
export function DemoModeSwitch({ isDemo, onChange, disabled, compact }: Props) {
  const { t } = useSettings();

  return (
    <div className={`demo-switch${compact ? ' demo-switch--compact' : ''}${isDemo ? ' demo-switch--on' : ''}`}>
      <div className="demo-switch-text">
        <span className="demo-switch-label">{t.demo.label}</span>
        {!compact && <span className="demo-switch-hint">{t.demo.hint}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isDemo}
        aria-label={t.demo.label}
        className={`demo-switch-track${isDemo ? ' demo-switch-track--on' : ''}`}
        disabled={disabled}
        onClick={() => onChange(!isDemo)}
      >
        <span className="demo-switch-thumb" aria-hidden />
      </button>
    </div>
  );
}
