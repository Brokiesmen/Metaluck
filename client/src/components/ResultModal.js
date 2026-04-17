import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { RARITY, GIFT_IMAGES } from '../data';
export function ResultModal({ prize, onClose }) {
    useEffect(() => {
        if (prize) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                zIndex: 9999
            });
        }
    }, [prize]);
    if (!prize)
        return null;
    const r = RARITY[prize.rarity];
    const img = GIFT_IMAGES[prize.id];
    return (_jsx("div", { className: "modal-overlay", onClick: onClose, children: _jsxs("div", { className: "modal-sheet", onClick: e => e.stopPropagation(), children: [_jsx("div", { className: "modal-handle" }), _jsx("div", { className: "modal-icon-wrap", style: { borderColor: r.border, color: r.border }, children: img?.animated
                        ? _jsx("img", { src: img.animated, alt: prize.name, className: "modal-anim" })
                        : img
                            ? _jsx("img", { src: img.image, alt: prize.name, className: "modal-anim" })
                            : _jsx("span", { className: "modal-icon", children: prize.icon }) }), _jsx("div", { className: "modal-rarity", style: { color: r.text }, children: r.label }), _jsx("div", { className: "modal-name", children: prize.name }), _jsx("button", { className: "tg-btn", onClick: onClose, children: "\u0417\u0430\u0431\u0440\u0430\u0442\u044C" })] }) }));
}
