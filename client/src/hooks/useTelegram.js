// Dev fallback user (when opened outside Telegram)
const DEV_USER = {
    id: 0,
    first_name: 'Тест',
    last_name: 'Режим',
    username: 'devmode',
};
export function useTelegram() {
    const tg = window.Telegram?.WebApp ?? null;
    const user = tg?.initDataUnsafe?.user ?? DEV_USER;
    const initData = tg?.initData ?? '';
    const isDev = !tg || !tg.initData;
    return { tg, user, initData, isDev };
}
