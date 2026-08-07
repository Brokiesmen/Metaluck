import { useState } from 'react';
import { PageHeader } from '../PageHeader';
import { SectionHeader } from '../SectionHeader';
import { SettingRow } from '../SettingRow';
import { mockSettings } from '../mockData';

export function SettingsPage() {
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(mockSettings.filter((s) => s.kind === 'toggle').map((s) => [s.id, Boolean(s.value)])),
  );

  return (
    <div className="sh-page">
      <PageHeader title="Settings" />

      <SectionHeader title="Preferences" />
      <div className="sh-list sh-list--flush">
        {mockSettings.map((s) => (
          <SettingRow
            key={s.id}
            label={s.label}
            hint={s.hint}
            kind={s.kind}
            value={s.kind === 'toggle' ? toggles[s.id] : undefined}
            onToggle={(next) => setToggles((t) => ({ ...t, [s.id]: next }))}
          />
        ))}
      </div>

      <button type="button" className="sh-btn sh-signout">Sign out</button>
    </div>
  );
}
