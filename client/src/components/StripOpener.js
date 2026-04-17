import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useRef, useEffect, useCallback } from 'react';
import { RARITY, GIFT_IMAGES } from '../data';
import { StarIcon } from './StarIcon';
const CARD_WIDTH = 130;
const CARD_GAP = 8;
const CARD_SLOT = CARD_WIDTH + CARD_GAP; // 138
const WINNER_IDX = 52;
const TOTAL = 65;
function makeCard(prize) {
    const r = RARITY[prize.rarity];
    const img = GIFT_IMAGES[prize.id];
    const div = document.createElement('div');
    div.className = 'strip-card';
    div.style.cssText = `border-color:${r.border}; color:${r.border};`;
    const mediaHtml = img
        ? `<img src="${img.image}" alt="${prize.name}" class="card-img" />`
        : `<div class="card-icon">${prize.icon}</div>`;
    div.innerHTML = `
    ${mediaHtml}
    <div class="card-overlay">
      <div class="card-name">${prize.name}</div>
    </div>
  `;
    return div;
}
function pickAny(prizes) {
    return prizes[Math.floor(Math.random() * prizes.length)];
}
export function StripOpener({ selectedCase, prizes, winner, previewKey, isAnimating, onOpen, onDone, }) {
    const stripRef = useRef(null);
    const trackRef = useRef(null);
    const buildStrip = useCallback((w) => {
        const strip = stripRef.current;
        const track = trackRef.current;
        if (!strip || !track)
            return;
        const LEFT_CARDS = 4; // cards visible to the left of the indicator
        const trackW = track.offsetWidth || 480;
        const startX = trackW / 2 - CARD_WIDTH / 2 - LEFT_CARDS * CARD_SLOT;
        strip.style.transition = 'none';
        strip.style.transform = `translateX(${startX}px)`;
        strip.innerHTML = '';
        for (let i = 0; i < TOTAL; i++) {
            strip.appendChild(makeCard(i === WINNER_IDX ? w : pickAny(prizes)));
        }
    }, [prizes]);
    const animateStrip = useCallback((onComplete) => {
        const strip = stripRef.current;
        const track = trackRef.current;
        if (!strip || !track)
            return;
        const finalX = track.offsetWidth / 2 - (WINNER_IDX * CARD_SLOT + CARD_WIDTH / 2);
        void strip.getBoundingClientRect();
        strip.style.transition = 'transform 7s cubic-bezier(0.08, 0.82, 0.17, 1)';
        strip.style.transform = `translateX(${finalX}px)`;
        setTimeout(onComplete, 7200);
    }, []);
    useEffect(() => {
        if (prizes.length > 0)
            buildStrip(pickAny(prizes));
    }, [selectedCase, previewKey, prizes, buildStrip]);
    useEffect(() => {
        if (!winner)
            return;
        buildStrip(winner);
        requestAnimationFrame(() => requestAnimationFrame(() => animateStrip(() => onDone(winner))));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [winner]);
    return (_jsxs("div", { className: "strip-section", children: [_jsxs("div", { className: "strip-wrapper", children: [_jsx("div", { className: "fade fade-left" }), _jsx("div", { className: "fade fade-right" }), _jsx("div", { className: "ind-arrow ind-top" }), _jsx("div", { className: "ind-line" }), _jsx("div", { className: "ind-arrow ind-bot" }), _jsx("div", { className: "strip-track", ref: trackRef, children: _jsx("div", { className: "strip", ref: stripRef }) })] }), _jsx("button", { className: `tg-btn open-btn${isAnimating ? ' loading' : ''}`, onClick: onOpen, disabled: !selectedCase || isAnimating, children: isAnimating ? ('Открывается…') : !selectedCase ? ('Выберите кейс') : (_jsxs(_Fragment, { children: [_jsxs("span", { className: "open-btn-text num", children: ["\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u00B7 ", selectedCase.price] }), _jsx("span", { className: "open-btn-star", "aria-hidden": true, children: _jsx(StarIcon, { size: 21, animate: false, glow: false }) })] })) })] }));
}
