import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { api, setInitData } from './api';
import { useTelegram } from './hooks/useTelegram';
import { TabBar } from './components/TabBar';
import { CaseGrid } from './components/CaseGrid';
import { StripOpener } from './components/StripOpener';
import { ResultModal } from './components/ResultModal';
import { PrizesGrid } from './components/PrizesGrid';
import { Cabinet } from './components/Cabinet';
import { Leaders } from './components/Leaders';
import { StarIcon } from './components/StarIcon';
import { MetaluckBrand } from './components/branding';
export function App() {
    const { tg, user, initData, isDev } = useTelegram();
    const [tab, setTab] = useState('cases');
    const [balance, setBalance] = useState(0);
    const [cases, setCases] = useState([]);
    const [prizes, setPrizes] = useState([]);
    const [selectedCase, setSelectedCase] = useState(null);
    const [winner, setWinner] = useState(null);
    const [resultPrize, setResultPrize] = useState(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [previewKey, setPreviewKey] = useState(0);
    const [error, setError] = useState(null);
    // ── Init and Load data ──────────────────────────────────────────────────────
    useEffect(() => {
        // 1. Init Telegram
        if (tg) {
            tg.ready();
            tg.expand();
            tg.setHeaderColor('#17212b');
            tg.setBackgroundColor('#17212b');
        }
        // 2. Set Auth Data
        setInitData(initData);
        // 3. Fetch data (Wait for auth to be set)
        Promise.all([api.getBalance(), api.getCases(), api.getPrizes()])
            .then(([bal, c, p]) => {
            setBalance(bal);
            setCases(c);
            setPrizes(p);
        })
            .catch((err) => {
            console.error('Initial load failed:', err);
            setError('Сервер недоступен. Попробуйте обновить страницу.');
        });
    }, [tg, initData]);
    // ── Open case ─────────────────────────────────────────────────────────────
    const handleOpen = useCallback(async () => {
        if (!selectedCase || isAnimating)
            return;
        setError(null);
        setIsAnimating(true);
        setWinner(null);
        try {
            const { prize, newBalance } = await api.openCase(selectedCase.id);
            setBalance(newBalance);
            setWinner(prize);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Ошибка сервера');
            setIsAnimating(false);
        }
    }, [selectedCase, isAnimating]);
    const handleDone = useCallback((prize) => {
        setIsAnimating(false);
        setWinner(null);
        setResultPrize(prize);
    }, []);
    const handleClose = useCallback(() => {
        setResultPrize(null);
        setPreviewKey(k => k + 1);
    }, []);
    return (_jsxs("div", { className: "app", children: [_jsxs("header", { className: "tg-header", children: [_jsx("div", { className: "tg-header-left", children: tab !== 'cases' && (_jsx("button", { className: "back-btn", onClick: () => setTab('cases'), children: "\u2039" })) }), _jsx("div", { className: "tg-header-title", children: tab === 'cases' ? (_jsx(MetaluckBrand, { layout: "horizontal", markSize: 24 })) : tab === 'leaders' ? ('Лидеры') : ('Кабинет') }), _jsx("div", { className: "tg-header-right", children: tab === 'cases' && (_jsxs("span", { className: "header-balance num", children: [balance.toLocaleString('ru-RU'), _jsx(StarIcon, { size: 18 })] })) })] }), error && _jsx("div", { className: "error-banner", children: error }), _jsx("main", { className: "page-content", children: tab === 'cases' ? (_jsxs(_Fragment, { children: [_jsx(StripOpener, { selectedCase: selectedCase, prizes: prizes, winner: winner, previewKey: previewKey, isAnimating: isAnimating, onOpen: handleOpen, onDone: handleDone }), _jsx(CaseGrid, { cases: cases, selected: selectedCase, onSelect: setSelectedCase, disabled: isAnimating }), _jsx(PrizesGrid, { prizes: prizes })] })) : tab === 'leaders' ? (_jsx(Leaders, {})) : (_jsx(Cabinet, { user: user, balance: balance, isDev: isDev })) }), _jsx(TabBar, { active: tab, onChange: setTab }), _jsx(ResultModal, { prize: resultPrize, onClose: handleClose })] }));
}
