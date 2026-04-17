import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { api } from '../api';
function getInitials(name) {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2)
        return (parts[0][0] + parts[1][0]).toUpperCase();
    if (parts.length === 1)
        return name.slice(0, 2).toUpperCase();
    return '?';
}
function getAvatarColor(name) {
    const colors = ['#f6a454', '#818e9a', '#64b6e5', '#7dc462', '#b388d7', '#ed777b'];
    let hash = 0;
    for (let i = 0; i < name.length; i++)
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}
export function Leaders() {
    const [leaders, setLeaders] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => {
        let active = true;
        api.getLeaders()
            .then(data => {
            if (active)
                setLeaders(data);
        })
            .catch(err => {
            if (active)
                setError(err.message || 'Error fetching leaders');
        });
        return () => { active = false; };
    }, []);
    return (_jsxs("div", { className: "leaders-page", children: [_jsxs("div", { className: "leaders-header", children: [_jsx("h1", { className: "leaders-title", children: "\u0422\u0430\u0431\u043B\u0438\u0446\u0430 \u043B\u0438\u0434\u0435\u0440\u043E\u0432" }), _jsx("p", { className: "leaders-subtitle", children: "\u0421\u043F\u0438\u0441\u043E\u043A \u043B\u0438\u0434\u0435\u0440\u043E\u0432, \u043D\u0430\u0431\u0440\u0430\u0432\u0448\u0438\u0445 \u043D\u0430\u0438\u0431\u043E\u043B\u044C\u0448\u0435\u0435 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u043E\u0447\u043A\u043E\u0432" }), _jsx("div", { className: "leaders-trophy", children: "\uD83C\uDFC6" })] }), error && _jsx("div", { className: "error-banner", children: error }), !leaders && !error && _jsx("div", { className: "loading", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." }), leaders && (_jsxs("div", { className: "leaders-list", children: [leaders.map((leader, index) => (_jsxs("div", { className: "leader-item", children: [_jsx("div", { className: "leader-avatar", children: leader.photoUrl ? (_jsx("img", { src: leader.photoUrl, alt: leader.name })) : (_jsx("div", { className: "leader-initials", style: { backgroundColor: getAvatarColor(leader.name) }, children: getInitials(leader.name) })) }), _jsxs("div", { className: "leader-info", children: [_jsx("div", { className: "leader-name", children: leader.name }), _jsxs("div", { className: "leader-balance num", children: [leader.balance.toLocaleString('ru-RU'), " coins"] })] }), _jsxs("div", { className: "leader-rank", children: ["# ", index + 1] })] }, leader.userId))), leaders.length === 0 && _jsx("div", { className: "empty", children: "\u0421\u043F\u0438\u0441\u043E\u043A \u043F\u0443\u0441\u0442" })] }))] }));
}
