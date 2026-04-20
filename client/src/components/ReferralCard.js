import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../api';

export function ReferralCard({ tg }) {
    const [data, setData]     = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        api.getReferralStatus().then(setData).catch(() => {});
    }, []);

    const refLink = data?.link || '';
    const reward = data?.rewardPerInvite ?? 500;

    const handleCopy = () => {
        if (!refLink) return;
        navigator.clipboard?.writeText(refLink).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => {
            // fallback: select text in a temp input
        });
    };

    const handleShare = () => {
        if (!refLink) return;
        const text = '🎰 Играю в Metaluck — открываю кейсы и выигрываю подарки Telegram! Присоединяйся:';
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(text)}`;
        if (tg?.openTelegramLink) {
            tg.openTelegramLink(shareUrl);
        } else {
            window.open(shareUrl, '_blank');
        }
    };

    return (_jsxs("div", { className: "referral-card tg-section", children: [
        // Header
        _jsxs("div", { className: "referral-header", children: [
            _jsx("div", { className: "referral-icon", children: "👥" }),
            _jsxs("div", { children: [
                _jsx("div", { className: "referral-title", children: "Реферальная программа" }),
                _jsxs("div", { className: "referral-subtitle", children: [
                  "Приведи друга — ",
                  reward,
                  " звёзд + ",
                  data?.cashbackPercent ?? 10,
                  "% кэшбэк",
                ] }),
            ]}),
        ]}),

        // Stats
        data && _jsxs("div", { className: "referral-stats", children: [
            _jsxs("div", { className: "referral-stat", children: [
                _jsx("div", { className: "referral-stat-value num", children: data.referredCount }),
                _jsx("div", { className: "referral-stat-label", children: data.referredCount === 1 ? 'друг' : data.referredCount >= 2 && data.referredCount <= 4 ? 'друга' : 'друзей' }),
            ]}),
            _jsx("div", { className: "referral-stat-sep" }),
            _jsxs("div", { className: "referral-stat", children: [
                _jsxs("div", { className: "referral-stat-value num", children: [data.totalEarned, " звёзд"] }),
                _jsx("div", { className: "referral-stat-label", children: "заработано" }),
            ]}),
        ]}),

        // Link
        _jsxs("div", { className: "referral-link-row", children: [
            _jsx("div", { className: "referral-link-text num", children: refLink || '...' }),
            _jsx("button", { className: `referral-copy-btn${copied ? ' copied' : ''}`, onClick: handleCopy, children: copied ? '✓ Скопировано' : 'Копировать' }),
        ]}),

        // Share button
        _jsx("button", { className: "tg-btn referral-share-btn", onClick: handleShare, children: "📤 Поделиться с другом" }),
    ]}));
}
