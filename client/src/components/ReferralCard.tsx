import { useEffect, useState } from 'react';
import { api } from '../api';
import { useSettings } from '../settings/SettingsContext';
import { tf } from '../i18n/tf';

interface Props {
  tg?: { openTelegramLink?: (url: string) => void } | null;
}

export function ReferralCard({ tg }: Props) {
  const { t } = useSettings();
  const [data, setData] = useState<{
    link: string;
    rewardPerInvite: number;
    cashbackPercent: number;
    referredCount: number;
    totalEarned: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.getReferralStatus().then(setData).catch(() => {});
  }, []);

  const refLink = data?.link || '';
  const reward = data?.rewardPerInvite ?? 500;
  const pct = data?.cashbackPercent ?? 10;
  const count = data?.referredCount ?? 0;

  const friendsLabel =
    count === 1 ? t.referral.friend1 : count >= 2 && count <= 4 ? t.referral.friendFew : t.referral.friendMany;

  const handleCopy = () => {
    if (!refLink) return;
    navigator.clipboard?.writeText(refLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const handleShare = () => {
    if (!refLink) return;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(t.referral.shareText)}`;
    if (tg?.openTelegramLink) tg.openTelegramLink(shareUrl);
    else window.open(shareUrl, '_blank');
  };

  return (
    <div className="referral-card tg-section">
      <div className="referral-header">
        <div className="referral-icon">👥</div>
        <div>
          <div className="referral-title">{t.referral.title}</div>
          <div className="referral-subtitle">
            {tf(t.referral.subtitle, { stars: reward, pct })}
          </div>
        </div>
      </div>

      {data && (
        <div className="referral-stats">
          <div className="referral-stat">
            <div className="referral-stat-value num">{data.referredCount}</div>
            <div className="referral-stat-label">{friendsLabel}</div>
          </div>
          <div className="referral-stat-sep" />
          <div className="referral-stat">
            <div className="referral-stat-value num">{tf(t.referral.starsEarned, { n: data.totalEarned })}</div>
            <div className="referral-stat-label">{t.referral.earned}</div>
          </div>
        </div>
      )}

      <div className="referral-link-row">
        <div className="referral-link-text num">{refLink || '...'}</div>
        <button className={`referral-copy-btn${copied ? ' copied' : ''}`} onClick={handleCopy}>
          {copied ? t.referral.copied : t.referral.copy}
        </button>
      </div>

      <button className="tg-btn referral-share-btn" onClick={handleShare}>
        {t.referral.shareBtn}
      </button>
    </div>
  );
}
