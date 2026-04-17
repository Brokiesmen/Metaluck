import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId } from 'react';
/**
 * Знак METALUCK — два скруглённых луча (X/M), бирюзовый градиент.
 */
export function MetaluckMark({ size = 32, className, title }) {
    const uid = useId().replace(/:/g, '');
    const gid = `mlg_${uid}`;
    return (_jsxs("svg", { className: className, width: size, height: size, viewBox: "0 0 48 48", fill: "none", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": title ? undefined : true, role: title ? 'img' : undefined, children: [title ? _jsx("title", { children: title }) : null, _jsx("defs", { children: _jsxs("linearGradient", { id: gid, x1: "4", y1: "6", x2: "46", y2: "44", gradientUnits: "userSpaceOnUse", children: [_jsx("stop", { stopColor: "#3FF5E8" }), _jsx("stop", { offset: "0.4", stopColor: "#14D9C4" }), _jsx("stop", { offset: "1", stopColor: "#0A7B70" })] }) }), _jsxs("g", { transform: "translate(24 24)", children: [_jsx("rect", { x: "-4.5", y: "-17", width: "9", height: "34", rx: "4.5", fill: `url(#${gid})`, transform: "rotate(45)" }), _jsx("rect", { x: "-4.5", y: "-17", width: "9", height: "34", rx: "4.5", fill: `url(#${gid})`, transform: "rotate(-45)" })] })] }));
}
