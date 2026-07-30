import type { AppLanguage } from '../settings/types';

export type Dict = {
  tabs: { games: string; leaders: string; daily: string; cabinet: string };
  header: {
    metaluck: string;
    cases: string;
    blackjack: string;
    coinflip: string;
    minerush: string;
    arena: string;
    leaders: string;
    daily: string;
    cabinet: string;
  };
  common: {
    close: string;
    loading: string;
    loadMore: string;
    backGames: string;
    serverUnavailable: string;
    stars: string;
    open: string;
    cancel: string;
    error: string;
    you: string;
    copy: string;
    copied: string;
    share: string;
    claim: string;
    openBtn: string;
    free: string;
    daily: string;
    back: string;
  };
  settings: {
    title: string;
    language: string;
    theme: string;
    light: string;
    dark: string;
    ariaOpen: string;
  };
  games: {
    casesTitle: string;
    casesSub: string;
    bjTitle: string;
    bjSub: string;
    coinTitle: string;
    coinSub: string;
    mrTitle: string;
    mrSub: string;
    arenaTitle: string;
    arenaSub: string;
    soon: string;
    soonPvp: string;
    soonArcadeTitle: string;
    soonArcadeSub: string;
  };
  cabinet: {
    balance: string;
    topup: string;
    withdraw: string;
    stats: string;
    opened: string;
    legendary: string;
    epic: string;
    rare: string;
    invite: string;
    history: string;
    emptyHistory: string;
    from: string;
    date: string;
    rarity: string;
    devMode: string;
  };
  rarity: {
    gray: string;
    blue: string;
    purple: string;
    gold: string;
  };
  leaders: {
    title: string;
    subtitle: string;
    players: string;
    empty: string;
    loadError: string;
  };
  daily: {
    title: string;
    gift: string;
    canWin: string;
    items: string;
    freeCase: string;
    freeReady: string;
    againIn: string;
    openCase: string;
    rewardTitle: string;
    dayN: string;
    claiming: string;
    claimGift: string;
    nextGiftIn: string;
    hoursMinutes: string;
    error: string;
  };
  referral: {
    title: string;
    subtitle: string;
    friend1: string;
    friendFew: string;
    friendMany: string;
    starsEarned: string;
    earned: string;
    copy: string;
    copied: string;
    shareBtn: string;
    shareText: string;
  };
  topup: {
    title: string;
    viaTelegram: string;
    loadingPackages: string;
    hit: string;
    cancel: string;
    successTitle: string;
    successOk: string;
    loadFail: string;
    unpaid: string;
    onlyInTelegram: string;
    cancelled: string;
    pendingConfirm: string;
    payError: string;
  };
  withdraw: {
    title: string;
    available: string;
    customAmount: string;
    sending: string;
    withdrawBtn: string;
    successTitle: string;
    successBody: string;
    ok: string;
    error: string;
  };
  cases: {
    backGames: string;
    selectCase: string;
    opening: string;
    spinFree: string;
    spinFreeTimer: string;
    openPrice: string;
    freeBadge: string;
    dailyBadge: string;
    possiblePrizes: string;
    serverError: string;
    take: string;
  };
  bj: {
    back: string;
    dealer: string;
    you: string;
    blackjack: string;
    win: string;
    push: string;
    bust: string;
    lose: string;
    hit: string;
    stand: string;
    double: string;
    deal: string;
    loadError: string;
    dealError: string;
    finishHandFirst: string;
    betSize: string;
    dealerZone: string;
    playerZone: string;
  };
  coin: {
    back: string;
    heads: string;
    tails: string;
    win: string;
    lose: string;
    flip: string;
    error: string;
    pickSide: string;
    betSize: string;
  };
  mr: {
    back: string;
    score: string;
    time: string;
    balance: string;
    win: string;
    mine: string;
    cashed: string;
    timeLabel: string;
    opened: string;
    stakeLost: string;
    newGame: string;
    play: string;
    canCash: string;
    flag: string;
    flagOn: string;
    cashout: string;
    stake: string;
    mines: string;
    max: string;
    easy: string;
    medium: string;
    hard: string;
    loadError: string;
    startError: string;
    moveError: string;
    cashError: string;
  };
  arena: {
    back: string;
    winner: string;
    youWin: string;
    pot: string;
    ballSpinning: string;
    empty: string;
    you: string;
    loading: string;
    roundRunning: string;
    addBet: string;
    placeBet: string;
    sec: string;
    loadError: string;
    betError: string;
    betSize: string;
  };
};

const ru: Dict = {
  tabs: { games: 'Игры', leaders: 'Лидеры', daily: 'Ежедневно', cabinet: 'Кабинет' },
  header: {
    metaluck: 'Metaluck',
    cases: 'Кейсы',
    blackjack: 'Блэкджек',
    coinflip: 'Орёл или решка',
    minerush: 'MineRush',
    arena: 'Арена',
    leaders: 'Лидеры',
    daily: 'Ежедневный подарок',
    cabinet: 'Кабинет',
  },
  common: {
    close: 'Закрыть',
    loading: 'Загрузка…',
    loadMore: 'Загрузить ещё',
    backGames: '‹ Игры',
    serverUnavailable: 'Сервер недоступен. Попробуйте обновить страницу.',
    stars: 'звёзд',
    open: 'Открыто',
    cancel: 'Отмена',
    error: 'Ошибка',
    you: 'Вы',
    copy: 'Копировать',
    copied: 'Скопировано',
    share: 'Поделиться',
    claim: 'Забрать',
    openBtn: 'Открыть',
    free: 'Бесплатно',
    daily: 'Ежедневно',
    back: '‹',
  },
  settings: {
    title: 'Настройки',
    language: 'Язык',
    theme: 'Тема',
    light: 'Светлая',
    dark: 'Тёмная',
    ariaOpen: 'Настройки',
  },
  games: {
    casesTitle: 'Кейсы',
    casesSub: 'Испытай удачу и выиграй призы Fragment',
    bjTitle: 'Блэкджек',
    bjSub: 'Классическая игра против дилера. Удвой свои звёзды!',
    coinTitle: 'Орёл или решка',
    coinSub: 'Угадай сторону монеты и удвой ставку!',
    mrTitle: 'MineRush',
    mrSub: 'Сапёр на звёзды — открой поле и забери выигрыш!',
    arenaTitle: 'Арена',
    arenaSub: 'Общий банк: чем больше ставка — тем больше шанс забрать всё!',
    soon: 'Скоро...',
    soonPvp: 'PvP турнир и командные челленджи',
    soonArcadeTitle: 'Скоро',
    soonArcadeSub: 'Аркада и быстрые мини-игры',
  },
  cabinet: {
    balance: 'Баланс',
    topup: 'Пополнить',
    withdraw: 'Вывести',
    stats: 'Статистика',
    opened: 'Открыто',
    legendary: 'Легендарных',
    epic: 'Эпических',
    rare: 'Редких',
    invite: 'Пригласить друга',
    history: 'История открытий',
    emptyHistory: 'Откройте первый кейс!',
    from: 'Получен из',
    date: 'Дата',
    rarity: 'Редкость',
    devMode: 'dev режим',
  },
  rarity: {
    gray: 'Обычный',
    blue: 'Редкий',
    purple: 'Эпический',
    gold: 'Легендарный',
  },
  leaders: {
    title: 'Лидеры',
    subtitle: 'Игроки с самым большим балансом звёзд',
    players: 'игроков',
    empty: 'Список пуст',
    loadError: 'Ошибка загрузки',
  },
  daily: {
    title: 'Ежедневный подарок',
    gift: 'Подарок',
    canWin: 'Что можно выиграть',
    items: 'предметов',
    freeCase: 'Бесплатный кейс',
    freeReady: 'Готов к открытию прямо сейчас!',
    againIn: 'Снова через',
    openCase: 'Открыть',
    rewardTitle: 'Ежедневная награда',
    dayN: 'День {n}',
    claiming: 'Забираем…',
    claimGift: '🎁 Забрать подарок дня',
    nextGiftIn: 'Следующий подарок через',
    hoursMinutes: '{h} ч {m} мин',
    error: 'Ошибка',
  },
  referral: {
    title: 'Реферальная программа',
    subtitle: 'Приведи друга — {stars} звёзд + {pct}% кэшбэк',
    friend1: 'друг',
    friendFew: 'друга',
    friendMany: 'друзей',
    starsEarned: '{n} звёзд',
    earned: 'заработано',
    copy: 'Копировать',
    copied: '✓ Скопировано',
    shareBtn: '📤 Поделиться с другом',
    shareText: '🎰 Играю в Metaluck — открываю кейсы и выигрываю подарки Telegram! Присоединяйся:',
  },
  topup: {
    title: 'Пополнить звёзды',
    viaTelegram: 'Оплата пройдёт через Telegram Stars',
    loadingPackages: 'Загрузка пакетов…',
    hit: 'ХИТ',
    cancel: 'Отмена',
    successTitle: 'Баланс пополнен',
    successOk: 'Отлично',
    loadFail: 'Не удалось загрузить пакеты',
    unpaid: 'Платеж не был завершён',
    onlyInTelegram: 'Оплата Telegram Stars доступна только внутри Telegram Mini App',
    cancelled: 'Платеж отменён',
    pendingConfirm: 'Платеж создан, но подтверждение ещё не пришло. Проверьте баланс через пару секунд.',
    payError: 'Ошибка оплаты',
  },
  withdraw: {
    title: 'Вывести звёзды',
    available: 'Доступно: {balance} ★ · мин. {min} ★',
    customAmount: 'Своя сумма',
    sending: 'Отправка…',
    withdrawBtn: 'Вывести {n} ★',
    successTitle: 'Заявка принята',
    successBody: 'Заявка #{id}. Звёзды будут отправлены вручную в Telegram.',
    ok: 'Понятно',
    error: 'Ошибка вывода',
  },
  cases: {
    backGames: '← Назад к играм',
    selectCase: 'Выберите кейс',
    opening: 'Открывается…',
    spinFree: 'Вращать бесплатно',
    spinFreeTimer: 'Вращать бесплатно · {t}',
    openPrice: 'Открыть · {price}',
    freeBadge: 'БЕСПЛАТНО',
    dailyBadge: 'ЕЖЕДНЕВНО',
    possiblePrizes: 'Возможные призы',
    serverError: 'Ошибка сервера',
    take: 'Забрать',
  },
  bj: {
    back: '‹ Игры',
    dealer: 'Дилер',
    you: 'Вы',
    blackjack: '🃏 БЛЭКДЖЕК!',
    win: '🏆 ПОБЕДА!',
    push: '🤝 НИЧЬЯ',
    bust: '💥 ПЕРЕБОР',
    lose: '😞 ПОРАЖЕНИЕ',
    hit: 'ЕЩЁ',
    stand: 'ХВАТИТ',
    double: '×2',
    deal: 'РАЗДАТЬ  •  {bet} ★',
    loadError: 'Ошибка загрузки',
    dealError: 'Ошибка раздачи',
    finishHandFirst: 'Сначала завершите текущую раздачу (Ещё или Хватит).',
    betSize: 'Размер ставки',
    dealerZone: 'Зона дилера',
    playerZone: 'Зона игрока',
  },
  coin: {
    back: '‹ Игры',
    heads: 'Орёл',
    tails: 'Решка',
    win: 'ПОБЕДА!',
    lose: 'МИМО',
    flip: 'ПОДБРОСИТЬ  •  {bet} ★',
    error: 'Ошибка игры',
    pickSide: 'Выбор стороны',
    betSize: 'Размер ставки',
  },
  mr: {
    back: '‹',
    score: 'Очки',
    time: 'Время',
    balance: 'Баланс',
    win: 'Победа!',
    mine: 'Мина!',
    cashed: 'Забрано!',
    timeLabel: 'Время: {t}',
    opened: 'Открыто: {n}',
    stakeLost: 'Ставка потеряна',
    newGame: 'Новая игра',
    play: 'Играть · {bet}',
    canCash: 'Можно забрать',
    flag: 'Флаг',
    flagOn: 'Флаг вкл',
    cashout: 'Забрать',
    stake: 'Ставка: {n}',
    mines: 'Мин: {n}',
    max: 'Макс: {n}',
    easy: 'Лёгкий',
    medium: 'Средний',
    hard: 'Сложный',
    loadError: 'Не удалось загрузить игру',
    startError: 'Ошибка старта',
    moveError: 'Ошибка хода',
    cashError: 'Ошибка вывода',
  },
  arena: {
    back: '‹ Игры',
    winner: 'Победитель',
    youWin: 'Вы!',
    pot: 'Банк',
    ballSpinning: 'Шарик запущен…',
    empty: 'Сделайте ставку — раунд начнётся, и другие игроки смогут присоединиться',
    you: 'Вы',
    loading: 'Загрузка…',
    roundRunning: 'Раунд идёт…',
    addBet: 'ДОБАВИТЬ  •  {bet} ★',
    placeBet: 'ПОСТАВИТЬ  •  {bet} ★',
    sec: '{n} сек',
    loadError: 'Ошибка загрузки',
    betError: 'Ошибка ставки',
    betSize: 'Размер ставки',
  },
};

const uk: Dict = {
  tabs: { games: 'Ігри', leaders: 'Лідери', daily: 'Щодня', cabinet: 'Кабінет' },
  header: {
    metaluck: 'Metaluck',
    cases: 'Кейси',
    blackjack: 'Блекджек',
    coinflip: 'Орел чи решка',
    minerush: 'MineRush',
    arena: 'Арена',
    leaders: 'Лідери',
    daily: 'Щоденний подарунок',
    cabinet: 'Кабінет',
  },
  common: {
    close: 'Закрити',
    loading: 'Завантаження…',
    loadMore: 'Завантажити ще',
    backGames: '‹ Ігри',
    serverUnavailable: 'Сервер недоступний. Спробуйте оновити сторінку.',
    stars: 'зірок',
    open: 'Відкрито',
    cancel: 'Скасувати',
    error: 'Помилка',
    you: 'Ви',
    copy: 'Копіювати',
    copied: 'Скопійовано',
    share: 'Поділитися',
    claim: 'Забрати',
    openBtn: 'Відкрити',
    free: 'Безкоштовно',
    daily: 'Щодня',
    back: '‹',
  },
  settings: {
    title: 'Налаштування',
    language: 'Мова',
    theme: 'Тема',
    light: 'Світла',
    dark: 'Темна',
    ariaOpen: 'Налаштування',
  },
  games: {
    casesTitle: 'Кейси',
    casesSub: 'Випробуй удачу та виграй призи Fragment',
    bjTitle: 'Блекджек',
    bjSub: 'Класична гра проти дилера. Подвой свої зірки!',
    coinTitle: 'Орел чи решка',
    coinSub: 'Вгадай бік монети та подвой ставку!',
    mrTitle: 'MineRush',
    mrSub: 'Сапер на зірки — відкрий поле і забери виграш!',
    arenaTitle: 'Арена',
    arenaSub: 'Спільний банк: що більша ставка — то більший шанс забрати все!',
    soon: 'Скоро...',
    soonPvp: 'PvP турнір і командні челенджі',
    soonArcadeTitle: 'Незабаром',
    soonArcadeSub: 'Аркада та швидкі міні-ігри',
  },
  cabinet: {
    balance: 'Баланс',
    topup: 'Поповнити',
    withdraw: 'Вивести',
    stats: 'Статистика',
    opened: 'Відкрито',
    legendary: 'Легендарних',
    epic: 'Епічних',
    rare: 'Рідкісних',
    invite: 'Запросити друга',
    history: 'Історія відкриттів',
    emptyHistory: 'Відкрийте перший кейс!',
    from: 'Отримано з',
    date: 'Дата',
    rarity: 'Рідкість',
    devMode: 'dev режим',
  },
  rarity: {
    gray: 'Звичайний',
    blue: 'Рідкісний',
    purple: 'Епічний',
    gold: 'Легендарний',
  },
  leaders: {
    title: 'Лідери',
    subtitle: 'Гравці з найбільшим балансом зірок',
    players: 'гравців',
    empty: 'Список порожній',
    loadError: 'Помилка завантаження',
  },
  daily: {
    title: 'Щоденний подарунок',
    gift: 'Подарунок',
    canWin: 'Що можна виграти',
    items: 'предметів',
    freeCase: 'Безкоштовний кейс',
    freeReady: 'Готовий до відкриття просто зараз!',
    againIn: 'Знову через',
    openCase: 'Відкрити',
    rewardTitle: 'Щоденна нагорода',
    dayN: 'День {n}',
    claiming: 'Забираємо…',
    claimGift: '🎁 Забрати подарунок дня',
    nextGiftIn: 'Наступний подарунок через',
    hoursMinutes: '{h} год {m} хв',
    error: 'Помилка',
  },
  referral: {
    title: 'Реферальна програма',
    subtitle: 'Запроси друга — {stars} зірок + {pct}% кешбек',
    friend1: 'друг',
    friendFew: 'друзі',
    friendMany: 'друзів',
    starsEarned: '{n} зірок',
    earned: 'зароблено',
    copy: 'Копіювати',
    copied: '✓ Скопійовано',
    shareBtn: '📤 Поділитися з другом',
    shareText: '🎰 Граю в Metaluck — відкриваю кейси та виграю подарунки Telegram! Приєднуйся:',
  },
  topup: {
    title: 'Поповнити зірки',
    viaTelegram: 'Оплата пройде через Telegram Stars',
    loadingPackages: 'Завантаження пакетів…',
    hit: 'ХІТ',
    cancel: 'Скасувати',
    successTitle: 'Баланс поповнено',
    successOk: 'Чудово',
    loadFail: 'Не вдалося завантажити пакети',
    unpaid: 'Платіж не було завершено',
    onlyInTelegram: 'Оплата Telegram Stars доступна лише всередині Telegram Mini App',
    cancelled: 'Платіж скасовано',
    pendingConfirm: 'Платіж створено, але підтвердження ще не надійшло. Перевірте баланс за кілька секунд.',
    payError: 'Помилка оплати',
  },
  withdraw: {
    title: 'Вивести зірки',
    available: 'Доступно: {balance} ★ · мін. {min} ★',
    customAmount: 'Своя сума',
    sending: 'Надсилання…',
    withdrawBtn: 'Вивести {n} ★',
    successTitle: 'Заявку прийнято',
    successBody: 'Заявка #{id}. Зірки буде надіслано вручну в Telegram.',
    ok: 'Зрозуміло',
    error: 'Помилка виведення',
  },
  cases: {
    backGames: '← Назад до ігор',
    selectCase: 'Оберіть кейс',
    opening: 'Відкривається…',
    spinFree: 'Крутити безкоштовно',
    spinFreeTimer: 'Крутити безкоштовно · {t}',
    openPrice: 'Відкрити · {price}',
    freeBadge: 'БЕЗКОШТОВНО',
    dailyBadge: 'ЩОДНЯ',
    possiblePrizes: 'Можливі призи',
    serverError: 'Помилка сервера',
    take: 'Забрати',
  },
  bj: {
    back: '‹ Ігри',
    dealer: 'Дилер',
    you: 'Ви',
    blackjack: '🃏 БЛЕКДЖЕК!',
    win: '🏆 ПЕРЕМОГА!',
    push: '🤝 НІЧИЯ',
    bust: '💥 ПЕРЕБІР',
    lose: '😞 ПОРАЗКА',
    hit: 'ЩЕ',
    stand: 'ДОСИТЬ',
    double: '×2',
    deal: 'РОЗДАТИ  •  {bet} ★',
    loadError: 'Помилка завантаження',
    dealError: 'Помилка роздачі',
    finishHandFirst: 'Спочатку завершіть поточну роздачу (Ще або Досить).',
    betSize: 'Розмір ставки',
    dealerZone: 'Зона дилера',
    playerZone: 'Зона гравця',
  },
  coin: {
    back: '‹ Ігри',
    heads: 'Орел',
    tails: 'Решка',
    win: 'ПЕРЕМОГА!',
    lose: 'МИМО',
    flip: 'ПІДКИНУТИ  •  {bet} ★',
    error: 'Помилка гри',
    pickSide: 'Вибір сторони',
    betSize: 'Розмір ставки',
  },
  mr: {
    back: '‹',
    score: 'Очки',
    time: 'Час',
    balance: 'Баланс',
    win: 'Перемога!',
    mine: 'Міна!',
    cashed: 'Забрано!',
    timeLabel: 'Час: {t}',
    opened: 'Відкрито: {n}',
    stakeLost: 'Ставку втрачено',
    newGame: 'Нова гра',
    play: 'Грати · {bet}',
    canCash: 'Можна забрати',
    flag: 'Прапор',
    flagOn: 'Прапор вкл',
    cashout: 'Забрати',
    stake: 'Ставка: {n}',
    mines: 'Мін: {n}',
    max: 'Макс: {n}',
    easy: 'Легкий',
    medium: 'Середній',
    hard: 'Складний',
    loadError: 'Не вдалося завантажити гру',
    startError: 'Помилка старту',
    moveError: 'Помилка ходу',
    cashError: 'Помилка виведення',
  },
  arena: {
    back: '‹ Ігри',
    winner: 'Переможець',
    youWin: 'Ви!',
    pot: 'Банк',
    ballSpinning: 'Кульку запущено…',
    empty: 'Зробіть ставку — раунд почнеться, і інші гравці зможуть приєднатися',
    you: 'Ви',
    loading: 'Завантаження…',
    roundRunning: 'Раунд триває…',
    addBet: 'ДОДАТИ  •  {bet} ★',
    placeBet: 'ПОСТАВИТИ  •  {bet} ★',
    sec: '{n} сек',
    loadError: 'Помилка завантаження',
    betError: 'Помилка ставки',
    betSize: 'Розмір ставки',
  },
};

const en: Dict = {
  tabs: { games: 'Games', leaders: 'Leaders', daily: 'Daily', cabinet: 'Profile' },
  header: {
    metaluck: 'Metaluck',
    cases: 'Cases',
    blackjack: 'Blackjack',
    coinflip: 'Coin Flip',
    minerush: 'MineRush',
    arena: 'Arena',
    leaders: 'Leaders',
    daily: 'Daily Gift',
    cabinet: 'Profile',
  },
  common: {
    close: 'Close',
    loading: 'Loading…',
    loadMore: 'Load more',
    backGames: '‹ Games',
    serverUnavailable: 'Server unavailable. Please refresh the page.',
    stars: 'stars',
    open: 'Opened',
    cancel: 'Cancel',
    error: 'Error',
    you: 'You',
    copy: 'Copy',
    copied: 'Copied',
    share: 'Share',
    claim: 'Claim',
    openBtn: 'Open',
    free: 'Free',
    daily: 'Daily',
    back: '‹',
  },
  settings: {
    title: 'Settings',
    language: 'Language',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    ariaOpen: 'Settings',
  },
  games: {
    casesTitle: 'Cases',
    casesSub: 'Try your luck and win Fragment prizes',
    bjTitle: 'Blackjack',
    bjSub: 'Classic game vs the dealer. Double your stars!',
    coinTitle: 'Coin Flip',
    coinSub: 'Pick a side and double your bet!',
    mrTitle: 'MineRush',
    mrSub: 'Mines on stars — clear the field and cash out!',
    arenaTitle: 'Arena',
    arenaSub: 'Shared pot: the bigger your bet, the bigger your chance!',
    soon: 'Soon...',
    soonPvp: 'PvP tournament and team challenges',
    soonArcadeTitle: 'Coming Soon',
    soonArcadeSub: 'Arcade and quick mini-games',
  },
  cabinet: {
    balance: 'Balance',
    topup: 'Top up',
    withdraw: 'Withdraw',
    stats: 'Stats',
    opened: 'Opened',
    legendary: 'Legendary',
    epic: 'Epic',
    rare: 'Rare',
    invite: 'Invite a friend',
    history: 'Open history',
    emptyHistory: 'Open your first case!',
    from: 'From',
    date: 'Date',
    rarity: 'Rarity',
    devMode: 'dev mode',
  },
  rarity: {
    gray: 'Common',
    blue: 'Rare',
    purple: 'Epic',
    gold: 'Legendary',
  },
  leaders: {
    title: 'Leaders',
    subtitle: 'Players with the highest star balance',
    players: 'players',
    empty: 'List is empty',
    loadError: 'Failed to load',
  },
  daily: {
    title: 'Daily Gift',
    gift: 'Gift',
    canWin: 'What you can win',
    items: 'items',
    freeCase: 'Free case',
    freeReady: 'Ready to open right now!',
    againIn: 'Again in',
    openCase: 'Open',
    rewardTitle: 'Daily reward',
    dayN: 'Day {n}',
    claiming: 'Claiming…',
    claimGift: '🎁 Claim today’s gift',
    nextGiftIn: 'Next gift in',
    hoursMinutes: '{h}h {m}m',
    error: 'Error',
  },
  referral: {
    title: 'Referral program',
    subtitle: 'Invite a friend — {stars} stars + {pct}% cashback',
    friend1: 'friend',
    friendFew: 'friends',
    friendMany: 'friends',
    starsEarned: '{n} stars',
    earned: 'earned',
    copy: 'Copy',
    copied: '✓ Copied',
    shareBtn: '📤 Share with a friend',
    shareText: '🎰 I’m playing Metaluck — opening cases and winning Telegram gifts! Join me:',
  },
  topup: {
    title: 'Top up stars',
    viaTelegram: 'Payment via Telegram Stars',
    loadingPackages: 'Loading packages…',
    hit: 'HOT',
    cancel: 'Cancel',
    successTitle: 'Balance topped up',
    successOk: 'Great',
    loadFail: 'Failed to load packages',
    unpaid: 'Payment was not completed',
    onlyInTelegram: 'Telegram Stars payments are only available inside the Telegram Mini App',
    cancelled: 'Payment cancelled',
    pendingConfirm: 'Payment created, but confirmation has not arrived yet. Check your balance in a few seconds.',
    payError: 'Payment error',
  },
  withdraw: {
    title: 'Withdraw stars',
    available: 'Available: {balance} ★ · min. {min} ★',
    customAmount: 'Custom amount',
    sending: 'Sending…',
    withdrawBtn: 'Withdraw {n} ★',
    successTitle: 'Request accepted',
    successBody: 'Request #{id}. Stars will be sent manually in Telegram.',
    ok: 'Got it',
    error: 'Withdrawal error',
  },
  cases: {
    backGames: '← Back to games',
    selectCase: 'Select a case',
    opening: 'Opening…',
    spinFree: 'Spin for free',
    spinFreeTimer: 'Spin for free · {t}',
    openPrice: 'Open · {price}',
    freeBadge: 'FREE',
    dailyBadge: 'DAILY',
    possiblePrizes: 'Possible prizes',
    serverError: 'Server error',
    take: 'Claim',
  },
  bj: {
    back: '‹ Games',
    dealer: 'Dealer',
    you: 'You',
    blackjack: '🃏 BLACKJACK!',
    win: '🏆 WIN!',
    push: '🤝 PUSH',
    bust: '💥 BUST',
    lose: '😞 LOSE',
    hit: 'HIT',
    stand: 'STAND',
    double: '×2',
    deal: 'DEAL  •  {bet} ★',
    loadError: 'Failed to load',
    dealError: 'Deal error',
    finishHandFirst: 'Finish the current hand first (Hit or Stand).',
    betSize: 'Bet size',
    dealerZone: 'Dealer zone',
    playerZone: 'Player zone',
  },
  coin: {
    back: '‹ Games',
    heads: 'Heads',
    tails: 'Tails',
    win: 'WIN!',
    lose: 'MISS',
    flip: 'FLIP  •  {bet} ★',
    error: 'Game error',
    pickSide: 'Pick a side',
    betSize: 'Bet size',
  },
  mr: {
    back: '‹',
    score: 'Score',
    time: 'Time',
    balance: 'Balance',
    win: 'Victory!',
    mine: 'Mine!',
    cashed: 'Cashed out!',
    timeLabel: 'Time: {t}',
    opened: 'Opened: {n}',
    stakeLost: 'Stake lost',
    newGame: 'New game',
    play: 'Play · {bet}',
    canCash: 'Can cash out',
    flag: 'Flag',
    flagOn: 'Flag on',
    cashout: 'Cash out',
    stake: 'Stake: {n}',
    mines: 'Mines: {n}',
    max: 'Max: {n}',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    loadError: 'Failed to load game',
    startError: 'Start error',
    moveError: 'Move error',
    cashError: 'Cash out error',
  },
  arena: {
    back: '‹ Games',
    winner: 'Winner',
    youWin: 'You!',
    pot: 'Pot',
    ballSpinning: 'Ball spinning…',
    empty: 'Place a bet — the round will start and others can join',
    you: 'You',
    loading: 'Loading…',
    roundRunning: 'Round in progress…',
    addBet: 'ADD  •  {bet} ★',
    placeBet: 'BET  •  {bet} ★',
    sec: '{n}s',
    loadError: 'Failed to load',
    betError: 'Bet error',
    betSize: 'Bet size',
  },
};

const es: Dict = {
  tabs: { games: 'Juegos', leaders: 'Líderes', daily: 'Diario', cabinet: 'Perfil' },
  header: {
    metaluck: 'Metaluck',
    cases: 'Cajas',
    blackjack: 'Blackjack',
    coinflip: 'Cara o cruz',
    minerush: 'MineRush',
    arena: 'Arena',
    leaders: 'Líderes',
    daily: 'Regalo diario',
    cabinet: 'Perfil',
  },
  common: {
    close: 'Cerrar',
    loading: 'Cargando…',
    loadMore: 'Cargar más',
    backGames: '‹ Juegos',
    serverUnavailable: 'Servidor no disponible. Actualiza la página.',
    stars: 'estrellas',
    open: 'Abiertos',
    cancel: 'Cancelar',
    error: 'Error',
    you: 'Tú',
    copy: 'Copiar',
    copied: 'Copiado',
    share: 'Compartir',
    claim: 'Reclamar',
    openBtn: 'Abrir',
    free: 'Gratis',
    daily: 'Diario',
    back: '‹',
  },
  settings: {
    title: 'Ajustes',
    language: 'Idioma',
    theme: 'Tema',
    light: 'Clara',
    dark: 'Oscura',
    ariaOpen: 'Ajustes',
  },
  games: {
    casesTitle: 'Cajas',
    casesSub: 'Prueba tu suerte y gana premios Fragment',
    bjTitle: 'Blackjack',
    bjSub: 'Clásico contra el crupier. ¡Duplica tus estrellas!',
    coinTitle: 'Cara o cruz',
    coinSub: '¡Elige un lado y duplica tu apuesta!',
    mrTitle: 'MineRush',
    mrSub: 'Buscaminas con estrellas — ¡abre el campo y cobra!',
    arenaTitle: 'Arena',
    arenaSub: 'Bote compartido: ¡más apuesta, más chance de llevarte todo!',
    soon: 'Pronto...',
    soonPvp: 'Torneo PvP y desafíos de equipo',
    soonArcadeTitle: 'Próximamente',
    soonArcadeSub: 'Arcade y minijuegos rápidos',
  },
  cabinet: {
    balance: 'Saldo',
    topup: 'Recargar',
    withdraw: 'Retirar',
    stats: 'Estadísticas',
    opened: 'Abiertos',
    legendary: 'Legendarios',
    epic: 'Épicos',
    rare: 'Raros',
    invite: 'Invitar a un amigo',
    history: 'Historial de aperturas',
    emptyHistory: '¡Abre tu primera caja!',
    from: 'Obtenido de',
    date: 'Fecha',
    rarity: 'Rareza',
    devMode: 'modo dev',
  },
  rarity: {
    gray: 'Común',
    blue: 'Raro',
    purple: 'Épico',
    gold: 'Legendario',
  },
  leaders: {
    title: 'Líderes',
    subtitle: 'Jugadores con el mayor saldo de estrellas',
    players: 'jugadores',
    empty: 'Lista vacía',
    loadError: 'Error al cargar',
  },
  daily: {
    title: 'Regalo diario',
    gift: 'Regalo',
    canWin: 'Qué puedes ganar',
    items: 'objetos',
    freeCase: 'Caja gratis',
    freeReady: '¡Lista para abrir ahora mismo!',
    againIn: 'De nuevo en',
    openCase: 'Abrir',
    rewardTitle: 'Recompensa diaria',
    dayN: 'Día {n}',
    claiming: 'Reclamando…',
    claimGift: '🎁 Reclamar regalo del día',
    nextGiftIn: 'Próximo regalo en',
    hoursMinutes: '{h} h {m} min',
    error: 'Error',
  },
  referral: {
    title: 'Programa de referidos',
    subtitle: 'Invita a un amigo — {stars} estrellas + {pct}% de cashback',
    friend1: 'amigo',
    friendFew: 'amigos',
    friendMany: 'amigos',
    starsEarned: '{n} estrellas',
    earned: 'ganado',
    copy: 'Copiar',
    copied: '✓ Copiado',
    shareBtn: '📤 Compartir con un amigo',
    shareText: '🎰 Estoy jugando a Metaluck — abro cajas y gano regalos de Telegram! Únete:',
  },
  topup: {
    title: 'Recargar estrellas',
    viaTelegram: 'El pago se realiza con Telegram Stars',
    loadingPackages: 'Cargando paquetes…',
    hit: 'TOP',
    cancel: 'Cancelar',
    successTitle: 'Saldo recargado',
    successOk: 'Genial',
    loadFail: 'No se pudieron cargar los paquetes',
    unpaid: 'El pago no se completó',
    onlyInTelegram: 'El pago con Telegram Stars solo está disponible dentro de Telegram Mini App',
    cancelled: 'Pago cancelado',
    pendingConfirm: 'Pago creado, pero la confirmación aún no ha llegado. Revisa tu saldo en unos segundos.',
    payError: 'Error de pago',
  },
  withdraw: {
    title: 'Retirar estrellas',
    available: 'Disponible: {balance} ★ · mín. {min} ★',
    customAmount: 'Cantidad personalizada',
    sending: 'Enviando…',
    withdrawBtn: 'Retirar {n} ★',
    successTitle: 'Solicitud aceptada',
    successBody: 'Solicitud #{id}. Las estrellas se enviarán manualmente por Telegram.',
    ok: 'Entendido',
    error: 'Error al retirar',
  },
  cases: {
    backGames: '← Volver a juegos',
    selectCase: 'Elige una caja',
    opening: 'Abriendo…',
    spinFree: 'Girar gratis',
    spinFreeTimer: 'Girar gratis · {t}',
    openPrice: 'Abrir · {price}',
    freeBadge: 'GRATIS',
    dailyBadge: 'DIARIO',
    possiblePrizes: 'Premios posibles',
    serverError: 'Error del servidor',
    take: 'Reclamar',
  },
  bj: {
    back: '‹ Juegos',
    dealer: 'Crupier',
    you: 'Tú',
    blackjack: '🃏 ¡BLACKJACK!',
    win: '🏆 ¡VICTORIA!',
    push: '🤝 EMPATE',
    bust: '💥 PASADO',
    lose: '😞 DERROTA',
    hit: 'PEDIR',
    stand: 'PLANTARSE',
    double: '×2',
    deal: 'REPARTIR  •  {bet} ★',
    loadError: 'Error al cargar',
    dealError: 'Error al repartir',
    finishHandFirst: 'Termina primero la mano actual (Pedir o Plantarse).',
    betSize: 'Tamaño de apuesta',
    dealerZone: 'Zona del crupier',
    playerZone: 'Zona del jugador',
  },
  coin: {
    back: '‹ Juegos',
    heads: 'Cara',
    tails: 'Cruz',
    win: '¡VICTORIA!',
    lose: 'FALLASTE',
    flip: 'LANZAR  •  {bet} ★',
    error: 'Error del juego',
    pickSide: 'Elige un lado',
    betSize: 'Tamaño de apuesta',
  },
  mr: {
    back: '‹',
    score: 'Puntos',
    time: 'Tiempo',
    balance: 'Saldo',
    win: '¡Victoria!',
    mine: '¡Mina!',
    cashed: '¡Cobrado!',
    timeLabel: 'Tiempo: {t}',
    opened: 'Abiertas: {n}',
    stakeLost: 'Apuesta perdida',
    newGame: 'Nueva partida',
    play: 'Jugar · {bet}',
    canCash: 'Puedes cobrar',
    flag: 'Bandera',
    flagOn: 'Bandera activa',
    cashout: 'Cobrar',
    stake: 'Apuesta: {n}',
    mines: 'Minas: {n}',
    max: 'Máx: {n}',
    easy: 'Fácil',
    medium: 'Medio',
    hard: 'Difícil',
    loadError: 'No se pudo cargar el juego',
    startError: 'Error al iniciar',
    moveError: 'Error de movimiento',
    cashError: 'Error al cobrar',
  },
  arena: {
    back: '‹ Juegos',
    winner: 'Ganador',
    youWin: '¡Tú!',
    pot: 'Bote',
    ballSpinning: 'Bola girando…',
    empty: 'Haz una apuesta — empezará la ronda y otros podrán unirse',
    you: 'Tú',
    loading: 'Cargando…',
    roundRunning: 'Ronda en curso…',
    addBet: 'AÑADIR  •  {bet} ★',
    placeBet: 'APOSTAR  •  {bet} ★',
    sec: '{n} s',
    loadError: 'Error al cargar',
    betError: 'Error de apuesta',
    betSize: 'Tamaño de apuesta',
  },
};

const de: Dict = {
  tabs: { games: 'Spiele', leaders: 'Rangliste', daily: 'Täglich', cabinet: 'Profil' },
  header: {
    metaluck: 'Metaluck',
    cases: 'Cases',
    blackjack: 'Blackjack',
    coinflip: 'Münzwurf',
    minerush: 'MineRush',
    arena: 'Arena',
    leaders: 'Rangliste',
    daily: 'Tägliches Geschenk',
    cabinet: 'Profil',
  },
  common: {
    close: 'Schließen',
    loading: 'Laden…',
    loadMore: 'Mehr laden',
    backGames: '‹ Spiele',
    serverUnavailable: 'Server nicht erreichbar. Bitte Seite neu laden.',
    stars: 'Sterne',
    open: 'Geöffnet',
    cancel: 'Abbrechen',
    error: 'Fehler',
    you: 'Du',
    copy: 'Kopieren',
    copied: 'Kopiert',
    share: 'Teilen',
    claim: 'Abholen',
    openBtn: 'Öffnen',
    free: 'Kostenlos',
    daily: 'Täglich',
    back: '‹',
  },
  settings: {
    title: 'Einstellungen',
    language: 'Sprache',
    theme: 'Design',
    light: 'Hell',
    dark: 'Dunkel',
    ariaOpen: 'Einstellungen',
  },
  games: {
    casesTitle: 'Cases',
    casesSub: 'Versuch dein Glück und gewinne Fragment-Preise',
    bjTitle: 'Blackjack',
    bjSub: 'Klassisch gegen den Dealer. Verdopple deine Sterne!',
    coinTitle: 'Münzwurf',
    coinSub: 'Wähle eine Seite und verdopple deinen Einsatz!',
    mrTitle: 'MineRush',
    mrSub: 'Minenspiel um Sterne — öffne das Feld und cash out!',
    arenaTitle: 'Arena',
    arenaSub: 'Gemeinsamer Pot: je höher der Einsatz, desto größer die Chance!',
    soon: 'Bald...',
    soonPvp: 'PvP-Turnier und Team-Challenges',
    soonArcadeTitle: 'Demnächst',
    soonArcadeSub: 'Arcade und schnelle Minispiele',
  },
  cabinet: {
    balance: 'Guthaben',
    topup: 'Aufladen',
    withdraw: 'Auszahlen',
    stats: 'Statistik',
    opened: 'Geöffnet',
    legendary: 'Legendär',
    epic: 'Episch',
    rare: 'Selten',
    invite: 'Freund einladen',
    history: 'Öffnungshistorie',
    emptyHistory: 'Öffne deine erste Case!',
    from: 'Aus',
    date: 'Datum',
    rarity: 'Seltenheit',
    devMode: 'Dev-Modus',
  },
  rarity: {
    gray: 'Gewöhnlich',
    blue: 'Selten',
    purple: 'Episch',
    gold: 'Legendär',
  },
  leaders: {
    title: 'Rangliste',
    subtitle: 'Spieler mit dem höchsten Sterne-Guthaben',
    players: 'Spieler',
    empty: 'Liste ist leer',
    loadError: 'Laden fehlgeschlagen',
  },
  daily: {
    title: 'Tägliches Geschenk',
    gift: 'Geschenk',
    canWin: 'Was du gewinnen kannst',
    items: 'Gegenstände',
    freeCase: 'Kostenlose Case',
    freeReady: 'Jetzt bereit zum Öffnen!',
    againIn: 'Wieder in',
    openCase: 'Öffnen',
    rewardTitle: 'Tägliche Belohnung',
    dayN: 'Tag {n}',
    claiming: 'Wird abgeholt…',
    claimGift: '🎁 Tagesgeschenk abholen',
    nextGiftIn: 'Nächstes Geschenk in',
    hoursMinutes: '{h} Std. {m} Min.',
    error: 'Fehler',
  },
  referral: {
    title: 'Empfehlungsprogramm',
    subtitle: 'Lade einen Freund ein — {stars} Sterne + {pct}% Cashback',
    friend1: 'Freund',
    friendFew: 'Freunde',
    friendMany: 'Freunde',
    starsEarned: '{n} Sterne',
    earned: 'verdient',
    copy: 'Kopieren',
    copied: '✓ Kopiert',
    shareBtn: '📤 Mit Freund teilen',
    shareText: '🎰 Ich spiele Metaluck — öffne Cases und gewinne Telegram-Geschenke! Mach mit:',
  },
  topup: {
    title: 'Sterne aufladen',
    viaTelegram: 'Zahlung über Telegram Stars',
    loadingPackages: 'Pakete werden geladen…',
    hit: 'HIT',
    cancel: 'Abbrechen',
    successTitle: 'Guthaben aufgeladen',
    successOk: 'Super',
    loadFail: 'Pakete konnten nicht geladen werden',
    unpaid: 'Zahlung wurde nicht abgeschlossen',
    onlyInTelegram: 'Telegram-Stars-Zahlungen sind nur in der Telegram Mini App verfügbar',
    cancelled: 'Zahlung abgebrochen',
    pendingConfirm: 'Zahlung erstellt, aber die Bestätigung steht noch aus. Prüfe dein Guthaben in ein paar Sekunden.',
    payError: 'Zahlungsfehler',
  },
  withdraw: {
    title: 'Sterne auszahlen',
    available: 'Verfügbar: {balance} ★ · min. {min} ★',
    customAmount: 'Eigener Betrag',
    sending: 'Wird gesendet…',
    withdrawBtn: '{n} ★ auszahlen',
    successTitle: 'Anfrage angenommen',
    successBody: 'Anfrage #{id}. Sterne werden manuell in Telegram gesendet.',
    ok: 'Verstanden',
    error: 'Auszahlungsfehler',
  },
  cases: {
    backGames: '← Zurück zu Spielen',
    selectCase: 'Case wählen',
    opening: 'Wird geöffnet…',
    spinFree: 'Kostenlos drehen',
    spinFreeTimer: 'Kostenlos drehen · {t}',
    openPrice: 'Öffnen · {price}',
    freeBadge: 'KOSTENLOS',
    dailyBadge: 'TÄGLICH',
    possiblePrizes: 'Mögliche Preise',
    serverError: 'Serverfehler',
    take: 'Abholen',
  },
  bj: {
    back: '‹ Spiele',
    dealer: 'Dealer',
    you: 'Du',
    blackjack: '🃏 BLACKJACK!',
    win: '🏆 GEWINN!',
    push: '🤝 UNENTSCHIEDEN',
    bust: '💥 BUST',
    lose: '😞 VERLOREN',
    hit: 'KARTE',
    stand: 'HALTEN',
    double: '×2',
    deal: 'GEBEN  •  {bet} ★',
    loadError: 'Laden fehlgeschlagen',
    dealError: 'Austeilfehler',
    finishHandFirst: 'Beende zuerst die aktuelle Hand (Karte oder Halten).',
    betSize: 'Einsatzgröße',
    dealerZone: 'Dealer-Zone',
    playerZone: 'Spieler-Zone',
  },
  coin: {
    back: '‹ Spiele',
    heads: 'Kopf',
    tails: 'Zahl',
    win: 'GEWINN!',
    lose: 'DANEBEN',
    flip: 'WERFEN  •  {bet} ★',
    error: 'Spielfehler',
    pickSide: 'Seite wählen',
    betSize: 'Einsatzgröße',
  },
  mr: {
    back: '‹',
    score: 'Punkte',
    time: 'Zeit',
    balance: 'Guthaben',
    win: 'Sieg!',
    mine: 'Mine!',
    cashed: 'Ausgezahlt!',
    timeLabel: 'Zeit: {t}',
    opened: 'Geöffnet: {n}',
    stakeLost: 'Einsatz verloren',
    newGame: 'Neues Spiel',
    play: 'Spielen · {bet}',
    canCash: 'Auszahlbar',
    flag: 'Flagge',
    flagOn: 'Flagge an',
    cashout: 'Auszahlen',
    stake: 'Einsatz: {n}',
    mines: 'Minen: {n}',
    max: 'Max: {n}',
    easy: 'Leicht',
    medium: 'Mittel',
    hard: 'Schwer',
    loadError: 'Spiel konnte nicht geladen werden',
    startError: 'Startfehler',
    moveError: 'Zugfehler',
    cashError: 'Auszahlungsfehler',
  },
  arena: {
    back: '‹ Spiele',
    winner: 'Gewinner',
    youWin: 'Du!',
    pot: 'Pot',
    ballSpinning: 'Kugel dreht…',
    empty: 'Setze einen Einsatz — die Runde startet und andere können beitreten',
    you: 'Du',
    loading: 'Laden…',
    roundRunning: 'Runde läuft…',
    addBet: 'HINZUFÜGEN  •  {bet} ★',
    placeBet: 'SETZEN  •  {bet} ★',
    sec: '{n} Sek.',
    loadError: 'Laden fehlgeschlagen',
    betError: 'Einsatzfehler',
    betSize: 'Einsatzgröße',
  },
};

export const DICTS: Record<AppLanguage, Dict> = { ru, uk, en, es, de };
