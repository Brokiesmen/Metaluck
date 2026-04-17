import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { api } from '../api';
import { StarIcon } from './StarIcon';

const PACKAGES = [
    { amount: 500,   label: 'Старт',      bonus: null,    popular: false },
    { amount: 1000,  label: 'Базовый',    bonus: null,    popular: false },
    { amount: 3000,  label: 'Популярный', bonus: '+10%',  popular: true  },
    { amount: 10000, label: 'Максимум',   bonus: '+20%',  popular: false },
];

export function TopUpModal({ onClose, onBalanceUpdate }) {
    const [loading, setLoading] = useState(false);
    const [done, setDone]       = useState(null); // { amount }
    const [error, setError]     = useState(null);

    const handleBuy = async (amount) => {
        if (loading) return;
        setError(null);
        setLoading(true);
        try {
            const { newBalance } = await api.topup(amount);
            onBalanceUpdate(newBalance);
            setDone({ amount });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ошибка');
        } finally {
            setLoading(false);
        }
    };

    return _jsx("div", { className: "modal-overlay", onClick: onClose, children:
        _jsxs("div", { className: "modal-sheet topup-sheet", onClick: e => e.stopPropagation(), children: [
            _jsx("div", { className: "modal-handle" }),

            done ? (
                // ── Success screen ────────────────────────────────────────
                _jsxs("div", { className: "topup-success", children: [
                    _jsx("div", { className: "topup-success-icon", children: "✅" }),
                    _jsx("div", { className: "topup-success-title", children: "Баланс пополнен!" }),
                    _jsxs("div", { className: "topup-success-amount num", children: [
                        "+", done.amount.toLocaleString('ru-RU'), " ", _jsx(StarIcon, { size: 22 })
                    ]}),
                    _jsx("button", { className: "tg-btn", onClick: onClose, children: "Отлично!" }),
                ]})
            ) : (
                // ── Packages screen ───────────────────────────────────────
                _jsxs("div", { children: [
                    _jsxs("div", { className: "topup-header", children: [
                        _jsx("div", { className: "topup-title", children: "Пополнить баланс" }),
                        _jsx("div", { className: "topup-subtitle", children: "Выберите пакет звёзд" }),
                    ]}),

                    error && _jsx("div", { className: "error-banner", style: { margin: '0 0 12px' }, children: error }),

                    _jsx("div", { className: "topup-grid", children:
                        PACKAGES.map(pkg =>
                            _jsxs("button", {
                                className: `topup-pkg${pkg.popular ? ' topup-pkg--popular' : ''}`,
                                onClick: () => handleBuy(pkg.amount),
                                disabled: loading,
                                children: [
                                    pkg.popular && _jsx("div", { className: "topup-pkg-badge", children: "ХИТ" }),
                                    _jsx("div", { className: "topup-pkg-icon", children: _jsx(StarIcon, { size: 28 }) }),
                                    _jsx("div", { className: "topup-pkg-amount num", children: pkg.amount.toLocaleString('ru-RU') }),
                                    _jsx("div", { className: "topup-pkg-label", children: pkg.label }),
                                    pkg.bonus && _jsx("div", { className: "topup-pkg-bonus", children: pkg.bonus }),
                                ]
                            }, pkg.amount)
                        )
                    }),

                    _jsx("button", { className: "topup-cancel", onClick: onClose, children: "Отмена" }),
                ]})
            )
        ]})
    });
}
