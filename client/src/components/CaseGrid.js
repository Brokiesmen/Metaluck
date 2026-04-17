import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { StarIcon } from './StarIcon';
export function CaseGrid({ cases, selected, onSelect, disabled }) {
    return (_jsxs("div", { className: "cases-section", children: [_jsx("div", { className: "tg-section-title", children: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043A\u0435\u0439\u0441" }), _jsx("div", { className: "cases-row", children: cases.map(c => (_jsxs("button", { className: `case-pill${selected?.id === c.id ? ' active' : ''}`, style: { '--case-color': c.color }, onClick: () => !disabled && onSelect(c), disabled: disabled, children: [_jsx("span", { className: "case-pill-icon", children: c.icon }), _jsx("span", { className: "case-pill-name", children: c.name }), _jsxs("span", { className: "case-pill-price num", children: [c.price, _jsx(StarIcon, { size: 15, animate: false })] })] }, c.id))) })] }));
}
