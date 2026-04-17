import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { RARITY, GIFT_IMAGES } from '../data';
const ORDER = { gray: 0, blue: 1, purple: 2, gold: 3 };
export function PrizesGrid({ prizes }) {
    const sorted = [...prizes].sort((a, b) => ORDER[a.rarity] - ORDER[b.rarity]);
    return (_jsxs("div", { className: "prizes-section", children: [_jsx("div", { className: "tg-section-title", children: "\u0412\u043E\u0437\u043C\u043E\u0436\u043D\u044B\u0435 \u043F\u0440\u0438\u0437\u044B" }), _jsx("div", { className: "prizes-grid", children: sorted.map(p => {
                    const r = RARITY[p.rarity];
                    const img = GIFT_IMAGES[p.id];
                    return (_jsxs("div", { className: "prize-card", style: { borderColor: r.border, color: r.border }, children: [_jsx("div", { className: "prize-img-wrap", children: img
                                    ? _jsx("img", { src: img.image, alt: p.name, className: "prize-img" })
                                    : _jsx("span", { className: "prize-icon", children: p.icon }) }), _jsxs("div", { className: "prize-card-overlay", children: [_jsx("div", { className: "prize-name", children: p.name }), _jsx("div", { className: "prize-rarity", children: r.label })] })] }, p.id));
                }) })] }));
}
