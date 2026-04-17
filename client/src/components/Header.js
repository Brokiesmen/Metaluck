import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Header({ balance }) {
    return (_jsx("header", { className: "header", children: _jsxs("div", { className: "header-inner", children: [_jsxs("h1", { className: "logo", children: ["CASE ", _jsx("span", { children: "OPENING" })] }), _jsxs("div", { className: "balance-block", children: [_jsx("span", { className: "balance-label", children: "\u0411\u0430\u043B\u0430\u043D\u0441" }), _jsxs("div", { className: "balance-value", children: [balance.toLocaleString('ru-RU'), " ", _jsx("span", { className: "coin", children: "\u25CF" })] })] })] }) }));
}
