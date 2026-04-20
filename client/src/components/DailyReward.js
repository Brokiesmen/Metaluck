import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../api';
import { GIFT_IMAGES, RARITY } from '../data';

// Must match server DAILY_REWARDS
const DAILY_REWARDS = [
  { day: 1, type: 'stars',  stars: 50,  label: '50',  icon: '●', color: '#e8c06a' },
  { day: 2, type: 'stars',  stars: 150, label: '150', icon: '●', color: '#e8c06a' },
  { day: 3, type: 'gift',   rarity: 'blue',   label: 'Подарок', icon: '🎁', color: '#a8c8f0' },
  { day: 4, type: 'stars',  stars: 300, label: '300', icon: '●', color: '#e8c06a' },
  { day: 5, type: 'gift',   rarity: 'purple', label: 'Подарок', icon: '🎁', color: '#b0acf5' },
  { day: 6, type: 'stars',  stars: 600, label: '600', icon: '●', color: '#e8c06a' },
  { day: 7, type: 'gift',   rarity: 'gold',   label: '🏆 Приз', icon: '🏆', color: '#e8c06a' },
];

function formatCountdown(ms) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}ч ${m}м`;
}

export function DailyReward({ onClose, onBalanceUpdate }) {
    const [status, setStatus]   = useState(null);
    const [claiming, setClaiming] = useState(false);
    const [result, setResult]   = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        api.getDailyStatus().then(setStatus).catch(() => {});
    }, []);

    // Countdown timer
    useEffect(() => {
        if (!status || status.canClaim || !status.nextClaimAt) return;
        const update = () => setTimeLeft(Math.max(0, status.nextClaimAt - Date.now()));
        update();
        const id = setInterval(update, 10000);
        return () => clearInterval(id);
    }, [status]);

    const handleClaim = async () => {
        if (claiming) return;
        setClaiming(true);
        try {
            const res = await api.claimDaily();
            setResult(res);
            // Update balance in parent (works for both stars and gifts)
            if (onBalanceUpdate) onBalanceUpdate(res.newBalance);
            // Confetti burst
            if (res.prize.rarity === 'gold') {
                confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 }, colors: ['#ffd700','#ffaa00','#ff8800','#e8c06a'], zIndex: 9999 });
                setTimeout(() => confetti({ particleCount: 80, spread: 70, origin: { y: 0.4 }, colors: ['#ffd700','#fff'], zIndex: 9999 }), 400);
            } else {
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, zIndex: 9999 });
            }
        } catch (err) {
            alert(err.message || 'Ошибка');
        } finally {
            setClaiming(false);
        }
    };

    // ── Result screen ──────────────────────────────────────────────────────────
    if (result) {
        const { prize } = result;
        const r   = RARITY[prize.rarity];
        const img = GIFT_IMAGES[prize.id];
        return (_jsx("div", { className: "modal-overlay", onClick: onClose, children:
            _jsxs("div", { className: "modal-sheet daily-result-sheet", onClick: e => e.stopPropagation(), children: [
                _jsx("div", { className: "modal-handle" }),
                _jsx("div", { className: "daily-result-label", children: `🎁 День ${result.day}` }),
                prize.stars
                    ? _jsxs("div", { className: "daily-result-stars", children: [
                        _jsx("div", { className: "daily-result-star-emoji", children: "Баланс" }),
                        _jsx("div", { className: "daily-result-star-count num", children: `+${prize.stars}` }),
                      ]})
                    : _jsx("div", { className: "modal-icon-wrap", style: { borderColor: r.border, color: r.border }, children:
                        img?.animated
                            ? _jsx("img", { src: img.animated, alt: prize.name, className: "modal-anim" })
                            : img
                                ? _jsx("img", { src: img.image, alt: prize.name, className: "modal-anim" })
                                : _jsx("span", { className: "modal-icon", children: prize.icon })
                      }),
                _jsx("div", { className: "modal-rarity", style: { color: prize.stars ? '#e8c06a' : r.text }, children: prize.stars ? 'Звёзды начислены!' : r.label }),
                _jsx("div", { className: "modal-name", children: prize.name }),
                _jsx("button", { className: "tg-btn", onClick: onClose, children: 'Отлично!' }),
            ]})
        }));
    }

    // ── Calendar screen ────────────────────────────────────────────────────────
    return (_jsx("div", { className: "modal-overlay", onClick: onClose, children:
        _jsxs("div", { className: "modal-sheet daily-sheet", onClick: e => e.stopPropagation(), children: [
            _jsx("div", { className: "modal-handle" }),
            _jsx("div", { className: "daily-title", children: "🎁 Ежедневный подарок" }),
            _jsx("div", { className: "daily-subtitle", children: "Заходи каждый день за наградой" }),

            // 7-day grid
            _jsx("div", { className: "daily-grid", children:
                DAILY_REWARDS.map(reward => {
                    const dayNum  = reward.day;
                    const claimed = status ? status.claimedDays[dayNum - 1] : false;
                    const current = status ? status.currentDay === dayNum : false;
                    const future  = !claimed && !current;

                    let cls = 'daily-day';
                    if (claimed) cls += ' daily-day--claimed';
                    else if (current) cls += ' daily-day--current';
                    else cls += ' daily-day--future';

                    return _jsxs("div", { className: cls, children: [
                        _jsx("div", { className: "daily-day-num", children: `День ${dayNum}` }),
                        claimed
                            ? _jsx("div", { className: "daily-day-check", children: "✓" })
                            : _jsx("div", { className: "daily-day-icon", style: { color: reward.color }, children: reward.icon }),
                        _jsx("div", { className: "daily-day-label", children:
                            reward.type === 'stars'
                                ? _jsxs("span", { children: [reward.label, ' звёзд'] })
                                : reward.label
                        }),
                    ]}, dayNum);
                })
            }),

            // Action
            status && status.canClaim
                ? _jsx("button", { className: "tg-btn daily-claim-action", onClick: handleClaim, disabled: claiming, children: claiming ? 'Забираем…' : '🎁 Забрать подарок' })
                : status && !status.canClaim && timeLeft > 0
                    ? _jsxs("div", { className: "daily-countdown", children: [
                        _jsx("div", { className: "daily-countdown-label", children: "Следующий подарок через" }),
                        _jsx("div", { className: "daily-countdown-time num", children: formatCountdown(timeLeft) }),
                      ]})
                    : _jsx("div", { className: "daily-countdown", children: "Загрузка…" }),
        ]})
    }));
}
