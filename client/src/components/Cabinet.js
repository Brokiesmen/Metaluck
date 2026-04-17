import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../api';
import { RARITY, GIFT_IMAGES } from '../data';
import { StarIcon } from './StarIcon';
import { DailyReward } from './DailyReward';
import { ReferralCard } from './ReferralCard';
import { TopUpModal } from './TopUpModal';
function formatDate(ts) {
    return new Date(ts).toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit',
        hour: '2-digit', minute: '2-digit',
    });
}
function Avatar({ user }) {
    if (user.photo_url) {
        return _jsx("img", { className: "avatar", src: user.photo_url, alt: "" });
    }
    const initials = [user.first_name[0], user.last_name?.[0]]
        .filter(Boolean).join('').toUpperCase();
    return _jsx("div", { className: "avatar avatar-placeholder", children: initials });
}
function GiftDetail({ entry, onClose }) {
    const r = RARITY[entry.prize.rarity];
    const img = GIFT_IMAGES[entry.prize.id];
    const rarityStars = { gray: 1, blue: 2, purple: 3, gold: 4 };
    const stars = rarityStars[entry.prize.rarity] ?? 1;
    return (_jsx("div", { className: "modal-overlay", onClick: onClose, children: _jsxs("div", { className: "modal-sheet gift-detail-sheet", onClick: e => e.stopPropagation(), children: [_jsx("div", { className: "modal-handle" }), _jsx("div", { className: "modal-icon-wrap", style: { borderColor: r.border, color: r.border }, children: img?.animated
                        ? _jsx("img", { src: img.animated, alt: entry.prize.name, className: "modal-anim" })
                        : img
                            ? _jsx("img", { src: img.image, alt: entry.prize.name, className: "modal-anim" })
                            : _jsx("span", { className: "modal-icon", children: entry.prize.icon }) }), _jsx("div", { className: "modal-rarity", style: { color: r.text }, children: r.label }), _jsx("div", { className: "modal-name", children: entry.prize.name }), _jsxs("div", { className: "gift-detail-stats", children: [_jsxs("div", { className: "gift-stat-row", children: [_jsx("span", { className: "gift-stat-label", children: "\u0420\u0435\u0434\u043A\u043E\u0441\u0442\u044C" }), _jsx("span", { className: "gift-stat-value num", children: Array.from({ length: 4 }).map((_, i) => (_jsx("span", { style: { opacity: i < stars ? 1 : 0.2 }, children: "\u2605" }, i))) })] }), _jsxs("div", { className: "gift-stat-row", children: [_jsx("span", { className: "gift-stat-label", children: "\u041F\u043E\u043B\u0443\u0447\u0435\u043D \u0438\u0437" }), _jsx("span", { className: "gift-stat-value", children: entry.caseName })] }), _jsxs("div", { className: "gift-stat-row", children: [_jsx("span", { className: "gift-stat-label", children: "\u0414\u0430\u0442\u0430" }), _jsx("span", { className: "gift-stat-value num", children: formatDate(entry.timestamp) })] })] }), _jsx("button", { className: "tg-btn", onClick: onClose, children: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C" })] }) }));
}
export function Cabinet({ user, balance: initialBalance, isDev, onBalanceUpdate, tg }) {
    const [balance, setBalance] = useState(initialBalance);
    const [history, setHistory] = useState([]);
    const [selected, setSelected] = useState(null);
    const [showDaily, setShowDaily] = useState(false);
    const [showTopUp, setShowTopUp] = useState(false);
    const [dailyAvailable, setDailyAvailable] = useState(false);
    useEffect(() => { setBalance(initialBalance); }, [initialBalance]);
    useEffect(() => {
        api.getHistory().then(setHistory).catch(() => { });
        api.getDailyStatus().then(s => setDailyAvailable(s.canClaim)).catch(() => {});
    }, []);
    const handleBalanceUpdate = (newBal) => {
        setBalance(newBal);
        if (onBalanceUpdate) onBalanceUpdate(newBal);
        setDailyAvailable(false);
        api.getHistory().then(setHistory).catch(() => {});
    };
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
    const stats = {
        total: history.length,
        gold: history.filter(e => e.prize.rarity === 'gold').length,
        purple: history.filter(e => e.prize.rarity === 'purple').length,
        blue: history.filter(e => e.prize.rarity === 'blue').length,
    };
    return (_jsxs("div", { className: "cabinet", children: [
        _jsx("div", { className: "tg-section", children: _jsxs("div", { className: "profile-row", children: [_jsx(Avatar, { user: user }), _jsxs("div", { className: "profile-info", children: [_jsx("div", { className: "profile-name", children: fullName }), user.username && _jsxs("div", { className: "profile-username", children: ["@", user.username] }), isDev && _jsx("div", { className: "dev-badge", children: "dev \u0440\u0435\u0436\u0438\u043C" })] })] }) }),
        _jsx("div", { className: "tg-section-title", children: "\u0411\u0430\u043B\u0430\u043D\u0441" }),
        _jsx("div", { className: "tg-section", children: _jsxs("div", { className: "balance-row", children: [_jsx(StarIcon, { size: 32 }), _jsx("span", { className: "balance-big num", style: { marginLeft: 8 }, children: balance.toLocaleString('ru-RU') }), _jsx("span", { className: "balance-unit", children: "\u0437\u0432\u0451\u0437\u0434" }), _jsx("button", { className: "topup-inline-btn", onClick: () => setShowTopUp(true), children: "+ \u041F\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u044C" })] }) }),
        _jsx("div", { className: "tg-section", children:
            _jsxs("button", { className: `daily-open-btn${dailyAvailable ? ' daily-open-btn--ready' : ''}`, onClick: () => setShowDaily(true), children: [
                _jsx("span", { className: "daily-open-icon", children: "🎁" }),
                _jsxs("div", { className: "daily-open-text", children: [
                    _jsx("div", { className: "daily-open-title", children: "\u0415\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u044B\u0439 \u043F\u043E\u0434\u0430\u0440\u043E\u043A" }),
                    _jsx("div", { className: "daily-open-sub", children: dailyAvailable ? '✨ Доступен сейчас!' : 'Нажми чтобы открыть' }),
                ]}),
                dailyAvailable && _jsx("span", { className: "daily-open-badge", children: "1" }),
                _jsx("span", { className: "daily-open-arrow", children: "›" }),
            ]}),
        }),
        _jsx(ReferralCard, { tg: tg }),
        stats.total > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "tg-section-title", children: "\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430" }), _jsx("div", { className: "tg-section", children: _jsxs("div", { className: "cabinet-stats-grid", children: [_jsxs("div", { className: "cabinet-stat", children: [_jsx("div", { className: "cabinet-stat-value num", children: stats.total }), _jsx("div", { className: "cabinet-stat-label", children: "\u041E\u0442\u043A\u0440\u044B\u0442\u043E" })] }), _jsxs("div", { className: "cabinet-stat", children: [_jsx("div", { className: "cabinet-stat-value num", style: { color: '#e8c06a' }, children: stats.gold }), _jsx("div", { className: "cabinet-stat-label", children: "\u041B\u0435\u0433\u0435\u043D\u0434\u0430\u0440\u043D\u044B\u0445" })] }), _jsxs("div", { className: "cabinet-stat", children: [_jsx("div", { className: "cabinet-stat-value num", style: { color: '#b0acf5' }, children: stats.purple }), _jsx("div", { className: "cabinet-stat-label", children: "\u042D\u043F\u0438\u0447\u0435\u0441\u043A\u0438\u0445" })] }), _jsxs("div", { className: "cabinet-stat", children: [_jsx("div", { className: "cabinet-stat-value num", style: { color: '#a8c8f0' }, children: stats.blue }), _jsx("div", { className: "cabinet-stat-label", children: "\u0420\u0435\u0434\u043A\u0438\u0445" })] })] }) })] })),
        _jsxs("div", { className: "tg-section-title", children: ["\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u0439", history.length > 0 && _jsx("span", { className: "history-count num", children: history.length })] }),
        history.length === 0 ? (_jsx("div", { className: "tg-section tg-hint-text", children: "\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u043F\u0435\u0440\u0432\u044B\u0439 \u043A\u0435\u0439\u0441!" })) : (_jsx("div", { className: "tg-section history-list", children: history.map((entry, i) => {
                    const r = RARITY[entry.prize.rarity];
                    const img = GIFT_IMAGES[entry.prize.id];
                    return (_jsxs("div", { className: `history-item history-item-btn${i < history.length - 1 ? ' sep' : ''}`, onClick: () => setSelected(entry), children: [_jsx("div", { className: "history-thumb", style: { borderColor: r.border, color: r.border }, children: img
                                    ? _jsx("img", { src: img.image, alt: entry.prize.name, className: "history-thumb-img" })
                                    : _jsx("span", { children: entry.prize.icon }) }), _jsxs("div", { className: "history-info", children: [_jsx("div", { className: "history-name", children: entry.prize.name }), _jsxs("div", { className: "history-meta", children: [_jsx("span", { style: { color: r.text }, children: r.label }), ' · ', _jsx("span", { style: { color: 'var(--tg-hint)' }, children: entry.caseName })] })] }), _jsxs("div", { className: "history-right", children: [_jsx("div", { className: "history-date num", children: formatDate(entry.timestamp) }), _jsx("div", { className: "history-chevron", children: "\u203A" })] })] }, i));
                }) })),
        selected && _jsx(GiftDetail, { entry: selected, onClose: () => setSelected(null) }),
        showDaily && _jsx(DailyReward, { onClose: () => setShowDaily(false), onBalanceUpdate: handleBalanceUpdate }),
        showTopUp && _jsx(TopUpModal, { onClose: () => setShowTopUp(false), onBalanceUpdate: handleBalanceUpdate }),
    ] }));
}
