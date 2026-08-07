import type { AppLanguage } from '../settings/types';

export type Dict = {
  tabs: { games: string; leaders: string; daily: string; cabinet: string; wallet: string };
  header: {
    metaluck: string;
    cases: string;
    blackjack: string;
    coinflip: string;
    minerush: string;
    arena: string;
    aviator: string;
    leaders: string;
    daily: string;
    cabinet: string;
    wallet: string;
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
    avTitle: string;
    avSub: string;
    soon: string;
    soonPvp: string;
    soonArcadeTitle: string;
    soonArcadeSub: string;
  };
  demo: {
    label: string;
    hint: string;
    enable: string;
    disable: string;
    resultNote: string;
    close: string;
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
    level: string;
    xpLabel: string;
    xpToNext: string;
    tasks: string;
    taskDailyLogin: string;
    taskOpenCase: string;
    taskOpenPaidCase: string;
    taskWinGame: string;
    taskClaimDaily: string;
    taskPlayCoinflip: string;
    taskPlayBlackjack: string;
    taskPlayMinerush: string;
    taskPlayArena: string;
    taskPlayAviator: string;
    taskWinCoinflip: string;
    taskWinBlackjack: string;
    taskWinMinerush: string;
    taskWinArena: string;
    taskWinAviator: string;
    tasksResetIn: string;
    done: string;
  };
  rules: {
    button: string;
    title: string;
    subtitle: string;
    close: string;
    generalTitle: string;
    generalBody: string;
    starsTitle: string;
    starsBody: string;
    casesTitle: string;
    casesBody: string;
    dailyTitle: string;
    dailyBody: string;
    gamesTitle: string;
    gamesIntro: string;
    coinflipTitle: string;
    coinflipBody: string;
    blackjackTitle: string;
    blackjackBody: string;
    minerushTitle: string;
    minerushBody: string;
    arenaTitle: string;
    arenaBody: string;
    aviatorTitle: string;
    aviatorBody: string;
    withdrawTitle: string;
    withdrawBody: string;
    demoTitle: string;
    demoBody: string;
    fairTitle: string;
    fairBody: string;
  };
  rarity: {
    gray: string;
    blue: string;
    purple: string;
    gold: string;
  };
  admin: {
    title: string;
    open: string;
    hint: string;
    save: string;
    refreshRates: string;
    denied: string;
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
    daysHoursMinutes: string;
    error: string;
    wheelTitle: string;
    wheelReady: string;
    wheelOpen: string;
    wheelHint: string;
    wheelSpin: string;
    wheelSpinning: string;
    wheelCooldown: string;
    wheelError: string;
    couponsLabel: string;
    premiumWheelTitle: string;
    premiumWheelHint: string;
    premiumSpinCoupon: string;
    premiumSpinStars: string;
    wheelNoCoupons: string;
    wheelPayTelegramOnly: string;
    wheelPayCancelled: string;
    wheelPayUsed: string;
    wheelPayPending: string;
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
  wallet: {
    title: string;
    balances: string;
    deposit: string;
    withdraw: string;
    exchange: string;
    history: string;
    assetStars: string;
    assetTon: string;
    assetUsdt: string;
    locked: string;
    ledgerTitle: string;
    ledgerEmpty: string;
    betCurrency: string;
    exchangeTitle: string;
    exchangeFrom: string;
    exchangeTo: string;
    exchangeAmount: string;
    exchangeQuote: string;
    exchangeConfirm: string;
    exchangeDone: string;
    exchangeSwap: string;
    exchangeYouGet: string;
    exchangeFee: string;
    exchangeRate: string;
    exchangeInvalidAmount: string;
    exchangeSamePair: string;
    exchangeAvailable: string;
    exchangeInsufficient: string;
    exchangeRealHint: string;
    exchangeDepositFirst: string;
    exchangeWithdrawTon: string;
    exchangeDoneHint: string;
    cryptoDeposit: string;
    cryptoAddress: string;
    cryptoCopy: string;
    cryptoCopied: string;
    cryptoSync: string;
    cryptoListening: string;
    cryptoMin: string;
    cryptoDisabled: string;
    cryptoDeposits: string;
    cryptoEmpty: string;
    cryptoPickCurrency: string;
    cryptoChangeCurrency: string;
    cryptoSelected: string;
    cryptoConfirmations: string;
    cryptoStatusPending: string;
    cryptoStatusConfirmed: string;
    cryptoStatusFailed: string;
    cryptoWithdraw: string;
    cryptoSection: string;
    cryptoNetwork: string;
    cryptoTopUp: string;
    cryptoCashOut: string;
    cryptoWdPickCurrency: string;
    cryptoWdDisabled: string;
    cryptoWdAddress: string;
    cryptoWdAmount: string;
    cryptoWdAvailable: string;
    cryptoWdContinue: string;
    cryptoWdBack: string;
    cryptoWdConfirmHint: string;
    cryptoWdConfirm: string;
    cryptoWdFee: string;
    cryptoWdNet: string;
    cryptoWdTotal: string;
    cryptoWdDaily: string;
    cryptoWdHistory: string;
    cryptoWdEmpty: string;
    cryptoWdInvalidAmount: string;
    cryptoWdInvalidAddress: string;
    cryptoWdStatusPending: string;
    cryptoWdStatusProcessing: string;
    cryptoWdStatusCompleted: string;
    cryptoWdStatusFailed: string;
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
    mult: string;
    multLabel: string;
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
  av: {
    back: string;
    history: string;
    historyEmpty: string;
    flewAway: string;
    startsIn: string;
    nextIn: string;
    secShort: string;
    waiting: string;
    pot: string;
    playersCount: string;
    yourWin: string;
    empty: string;
    you: string;
    autoShort: string;
    autoCashout: string;
    autoOff: string;
    autoUp: string;
    autoDown: string;
    cashOut: string;
    loading: string;
    roundRunning: string;
    cashedOut: string;
    nextRound: string;
    addBet: string;
    placeBet: string;
    betSize: string;
    loadError: string;
    betError: string;
    cashError: string;
    toastWin: string;
    toastLost: string;
  };
  auth: {
    title: string;
    subtitle: string;
    signingIn: string;
    googleError: string;
    telegramError: string;
    googleUnavailable: string;
    telegramUnavailable: string;
    miniAppHint: string;
    continueTelegram: string;
    continueGoogle: string;
    continueTon: string;
    continueEvm: string;
    walletError: string;
    or: string;
    openBot: string;
    telegramWaiting: string;
    telegramExpired: string;
  };
  desktop: {
    brand: string;
    dashboard: string;
    profile: string;
    wallet: string;
    games: string;
    rewards: string;
    settings: string;
    logout: string;
    notifications: string;
    noNotifications: string;
    welcome: string;
    dashboardHint: string;
    balance: string;
    playNow: string;
    openRewards: string;
    openProfile: string;
  };
};

const ru: Dict = {
  tabs: { games: 'Игры', leaders: 'Лидеры', daily: 'Ежедневно', cabinet: 'Кабинет', wallet: 'Кошелёк' },
  header: {
    metaluck: 'Metaluck',
    cases: 'Кейсы',
    blackjack: 'Блэкджек',
    coinflip: 'Орёл или звезда',
    minerush: 'MineRush',
    arena: 'Арена',
    aviator: 'Авиатор',
    leaders: 'Лидеры',
    daily: 'Ежедневный подарок',
    cabinet: 'Кабинет',
    wallet: 'Кошелёк',
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
    coinTitle: 'Орёл или звезда',
    coinSub: 'Угадай сторону монеты и удвой ставку!',
    mrTitle: 'MineRush',
    mrSub: 'Сапёр на звёзды — открой поле и забери выигрыш!',
    arenaTitle: 'Арена',
    arenaSub: 'Общий банк: чем больше ставка — тем больше шанс забрать всё!',
    avTitle: 'Авиатор',
    avSub: 'Множитель растёт — успей забрать до того, как самолёт улетит!',
    soon: 'Скоро...',
    soonPvp: 'PvP турнир и командные челленджи',
    soonArcadeTitle: 'Скоро',
    soonArcadeSub: 'Аркада и быстрые мини-игры',
  },
  demo: {
    label: 'Демо-режим',
    hint: 'Награды только визуальные — баланс, инвентарь и статистика не меняются',
    enable: 'Демо-режим',
    disable: 'Выйти из демо',
    resultNote: 'Демо — приз не зачислен',
    close: 'Понятно',
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
    level: 'Уровень',
    xpLabel: 'Опыт',
    xpToNext: '{n} XP до след. уровня',
    tasks: 'Задания',
    taskDailyLogin: 'Ежедневный вход',
    taskOpenCase: 'Открыть кейс',
    taskOpenPaidCase: 'Открыть платный кейс',
    taskWinGame: 'Выиграть в любой мини-игре',
    taskClaimDaily: 'Забрать ежедневный подарок',
    taskPlayCoinflip: 'Сыграть в Орёл/Звезда',
    taskPlayBlackjack: 'Сыграть в Блэкджек',
    taskPlayMinerush: 'Сыграть в Mine Rush',
    taskPlayArena: 'Сделать ставку на Арене',
    taskPlayAviator: 'Сделать ставку в Авиаторе',
    taskWinCoinflip: 'Выиграть в Орёл/Звезда',
    taskWinBlackjack: 'Выиграть в Блэкджек',
    taskWinMinerush: 'Выиграть в Mine Rush',
    taskWinArena: 'Выиграть на Арене',
    taskWinAviator: 'Забрать в Авиаторе',
    tasksResetIn: 'Задания обновятся через {t}',
    done: 'Готово',
  },
  rules: {
    button: 'Правила',
    title: 'Правила Metaluck',
    subtitle: 'Как устроены кейсы, мини-игры и вывод звёзд',
    close: 'Понятно',
    generalTitle: 'Общее',
    generalBody:
      'Metaluck — мини-приложение Telegram. Играйте на внутренние звёзды (★): открывайте кейсы, участвуйте в мини-играх и копите баланс. Звёзды внутри приложения — игровая валюта сервиса.',
    starsTitle: 'Звёзды (★)',
    starsBody:
      'Баланс пополняется через Telegram Stars и выигрыши. Звёзды можно тратить на кейсы и ставки в мини-играх. За активность начисляется XP и растёт уровень в кабинете.',
    casesTitle: 'Кейсы',
    casesBody:
      'Выберите кейс и откройте его за звёзды (или бесплатный, когда доступен). Приз определяется случайно по весам предметов. Выпавший подарок попадает в историю; звёздные призы зачисляются на баланс.',
    dailyTitle: 'Ежедневные награды',
    dailyBody:
      'Забирайте подарок каждый день по порядку: день 1 → 7, затем цикл начинается снова. Бесплатный кейс и колесо фортуны — раз в 7 дней.',
    gamesTitle: 'Мини-игры',
    gamesIntro:
      'Все мини-игры идут на ваш баланс ★. Ставка списывается сразу. Выигрыш зачисляется на баланс. Есть демо-режим: визуальный розыгрыш без изменения баланса.',
    coinflipTitle: 'Орёл или Звезда',
    coinflipBody:
      'Выберите сторону и ставку. Монета крутится; угадали — выигрыш ×2 (за вычетом комиссии дома). Не угадали — ставка сгорает.',
    blackjackTitle: 'Блэкджек',
    blackjackBody:
      'Классический блэкджек против дилера. Цель — набрать больше дилера, не превысив 21. Ставка возвращается с коэффициентом при победе; при блэкджеке — повышенный выигрыш.',
    minerushTitle: 'Mine Rush',
    minerushBody:
      'Поле 10×10 с минами. Открывайте безопасные клетки, ставьте флаги. Можно забрать выигрыш раньше (cash out) или очистить поле. Попали на мину — ставка проиграна. Большая ставка даёт больший множитель, но и больше мин. Выплаты с house edge 25%.',
    arenaTitle: 'Арена',
    arenaBody:
      'Общий банк: игроки делают ставки в окне раунда. Поле делится на сектора пропорционально ставкам. Шарик указывает победителя — он забирает банк (с комиссией дома). Можно ставить от 1 ★.',
    aviatorTitle: 'Авиатор',
    aviatorBody:
      'Ставка принимается в окне перед взлётом. После старта множитель растёт с каждой секундой, но в случайный момент самолёт улетает. Успели нажать «Забрать» — получаете ставку × текущий множитель; не успели — ставка сгорает. Auto Cashout забирает автоматически на выбранном множителе. Точка краша определяется на сервере до взлёта и не раскрывается заранее.',
    withdrawTitle: 'Вывод',
    withdrawBody:
      'Чтобы вывести звёзды, на балансе должно быть не меньше 100 ★. Минимальная сумма одной заявки — 100 ★. Заявка обрабатывается вручную; после создания сумма списывается с баланса. Демо-режим не даёт реального вывода.',
    demoTitle: 'Демо-режим',
    demoBody:
      'Включается в лобби игр. Розыгрыши и анимации работают, но баланс, инвентарь, XP и вывод не меняются. Удобно посмотреть, как устроены игры.',
    fairTitle: 'Важно',
    fairBody:
      'Исходы случайны. Сервис удерживает комиссию дома на ставках. Не играйте на суммы, которые не готовы потерять. Правила могут уточняться — актуальная версия всегда в этом разделе.',
  },
  admin: {
    title: 'Payment Hub',
    open: 'Админка Payment Hub',
    hint: 'Курсы, спред, комиссии, лимиты и операции. Изменения пишутся в БД без деплоя.',
    save: 'Сохранить',
    refreshRates: 'Обновить курсы',
    denied: 'Нет доступа',
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
    daysHoursMinutes: '{d} д {h} ч {m} мин',
    error: 'Ошибка',
    wheelTitle: 'Колесо фортуны',
    wheelReady: 'Бесплатный спин готов!',
    wheelOpen: 'Крутить',
    wheelHint: 'Бесплатно раз в 7 дней',
    wheelSpin: 'Крутить колесо',
    wheelSpinning: 'Крутим…',
    wheelCooldown: 'Подождите',
    wheelError: 'Не удалось крутить колесо',
    couponsLabel: 'Купоны',
    premiumWheelTitle: 'Премиум фортуна',
    premiumWheelHint: '1 купон или 25 Telegram Stars',
    premiumSpinCoupon: '🎟️ Купон ({n})',
    premiumSpinStars: '⭐ {n} Stars',
    wheelNoCoupons: 'Нет купонов',
    wheelPayTelegramOnly: 'Оплата Stars только в Telegram',
    wheelPayCancelled: 'Оплата отменена',
    wheelPayUsed: 'Вращение уже использовано',
    wheelPayPending: 'Ждём подтверждение оплаты…',
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
  wallet: {
    title: 'Кошелёк',
    balances: 'Балансы',
    deposit: 'Пополнить',
    withdraw: 'Вывести',
    exchange: 'Обменять',
    history: 'История',
    assetStars: 'Telegram Stars',
    assetTon: 'TON',
    assetUsdt: 'USDT TON',
    locked: 'В резерве',
    ledgerTitle: 'Операции',
    ledgerEmpty: 'Пока нет операций',
    betCurrency: 'Валюта ставки',
    exchangeTitle: 'Обмен',
    exchangeFrom: 'Отдаёте',
    exchangeTo: 'Получаете',
    exchangeAmount: 'Сумма',
    exchangeQuote: 'Рассчитать',
    exchangeConfirm: 'Обменять',
    exchangeDone: 'Обмен выполнен',
    exchangeSwap: 'Поменять местами',
    exchangeYouGet: 'К зачислению',
    exchangeFee: 'Комиссия',
    exchangeRate: 'Курс',
    exchangeInvalidAmount: 'Некорректная сумма',
    exchangeSamePair: 'Выберите разные валюты',
    exchangeAvailable: 'Доступно',
    exchangeInsufficient: 'Недостаточно средств — пополните баланс',
    exchangeRealHint: 'Обмен по реальному балансу TON, USDT и Stars',
    exchangeDepositFirst: 'Пополнить криптой',
    exchangeWithdrawTon: 'Вывести TON',
    exchangeDoneHint: 'Баланс обновлён. Можно вывести TON или продолжить обмен.',
    cryptoDeposit: 'Крипто-депозит',
    cryptoAddress: 'Ваш адрес TON',
    cryptoCopy: 'Копировать',
    cryptoCopied: 'Скопировано',
    cryptoSync: 'Проверить сеть',
    cryptoListening: 'Отправьте TON или USDT (TON) на этот адрес. Зачисление после подтверждений.',
    cryptoMin: 'Минимум',
    cryptoDisabled: 'Крипто-кошелёк временно недоступен',
    cryptoDeposits: 'Входящие',
    cryptoEmpty: 'Пока нет входящих переводов',
    cryptoPickCurrency: 'Выберите валюту для пополнения',
    cryptoChangeCurrency: '← Сменить валюту',
    cryptoSelected: 'Валюта',
    cryptoConfirmations: 'подтверждений',
    cryptoStatusPending: 'ожидание',
    cryptoStatusConfirmed: 'зачислено',
    cryptoStatusFailed: 'ошибка',
    cryptoWithdraw: 'Крипто-вывод',
    cryptoSection: 'Crypto',
    cryptoNetwork: 'Сеть',
    cryptoTopUp: 'Пополнить',
    cryptoCashOut: 'Вывести',
    cryptoWdPickCurrency: 'Выберите валюту для вывода',
    cryptoWdDisabled: 'Вывод криптовалюты временно недоступен',
    cryptoWdAddress: 'Адрес кошелька',
    cryptoWdAmount: 'Сумма',
    cryptoWdAvailable: 'Доступно',
    cryptoWdContinue: 'Далее',
    cryptoWdBack: '← Назад',
    cryptoWdConfirmHint: 'Проверьте данные и подтвердите вывод',
    cryptoWdConfirm: 'Подтвердить вывод',
    cryptoWdFee: 'Комиссия сети',
    cryptoWdNet: 'К получению',
    cryptoWdTotal: 'Итог',
    cryptoWdDaily: 'Дневной лимит',
    cryptoWdHistory: 'Заявки на вывод',
    cryptoWdEmpty: 'Пока нет заявок',
    cryptoWdInvalidAmount: 'Некорректная сумма',
    cryptoWdInvalidAddress: 'Укажите адрес кошелька',
    cryptoWdStatusPending: 'ожидание',
    cryptoWdStatusProcessing: 'отправка',
    cryptoWdStatusCompleted: 'выполнено',
    cryptoWdStatusFailed: 'ошибка',
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
    tails: 'Звезда',
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
    mult: '×{n}',
    multLabel: 'Множитель',
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
  av: {
    back: '‹ Игры',
    history: 'Последние множители',
    historyEmpty: 'Раундов пока не было',
    flewAway: 'УЛЕТЕЛ',
    startsIn: 'Взлёт через',
    nextIn: 'Новый раунд через',
    secShort: ' с',
    waiting: 'Ожидание раунда…',
    pot: 'Ставки',
    playersCount: 'Игроков',
    yourWin: 'Ваш выигрыш',
    empty: 'Сделайте ставку — раунд начнётся, и другие игроки смогут присоединиться',
    you: 'Вы',
    autoShort: 'авто',
    autoCashout: 'Auto Cashout',
    autoOff: 'выкл',
    autoUp: 'Увеличить авто-кэшаут',
    autoDown: 'Уменьшить авто-кэшаут',
    cashOut: 'ЗАБРАТЬ',
    loading: 'Загрузка…',
    roundRunning: 'Раунд идёт…',
    cashedOut: 'ЗАБРАЛИ НА {mult}',
    nextRound: 'Следующий раунд…',
    addBet: 'ДОБАВИТЬ  •  {bet} ★',
    placeBet: 'СТАВКА  •  {bet} ★',
    betSize: 'Размер ставки',
    loadError: 'Ошибка загрузки',
    betError: 'Ошибка ставки',
    cashError: 'Ошибка кэшаута',
    toastWin: 'Забрали на {mult} — +{amount} ★',
    toastLost: 'Улетел на {mult} — ставка сгорела',
  },
  auth: {
    title: 'Вход в Metaluck',
    subtitle: 'Кейсы, мини-игры и кошелёк — с любого устройства',
    signingIn: 'Входим…',
    googleError: 'Не удалось войти через Google',
    telegramError: 'Не удалось войти через Telegram',
    googleUnavailable: 'Google-вход скоро будет доступен',
    telegramUnavailable: 'Telegram-вход скоро будет доступен',
    miniAppHint: 'Уже в Telegram? Откройте мини-приложение бота — вход не нужен.',
    continueTelegram: 'Войти через Telegram',
    continueGoogle: 'Войти через Google',
    continueTon: 'Войти через TON Connect',
    continueEvm: 'Войти через WalletConnect',
    walletError: 'Не удалось войти через кошелёк',
    or: 'или',
    openBot: 'Открыть бота в Telegram →',
    telegramWaiting: 'Подтвердите вход в боте — затем вернитесь сюда',
    telegramExpired: 'Ссылка входа устарела. Нажмите «Войти через Telegram» снова',
  },
  desktop: {
    brand: 'Metaluck',
    dashboard: 'Dashboard',
    profile: 'Профиль',
    wallet: 'Кошелёк',
    games: 'Игры',
    rewards: 'Награды',
    settings: 'Настройки',
    logout: 'Выйти',
    notifications: 'Уведомления',
    noNotifications: 'Пока нет уведомлений',
    welcome: 'Привет, {name}',
    dashboardHint: 'Баланс, игры и награды — в одном месте.',
    balance: 'Баланс',
    playNow: 'Играть',
    openRewards: 'Открыть',
    openProfile: 'Кабинет',
  },
};

const uk: Dict = {
  tabs: { games: 'Ігри', leaders: 'Лідери', daily: 'Щодня', cabinet: 'Кабінет', wallet: 'Гаманець' },
  header: {
    metaluck: 'Metaluck',
    cases: 'Кейси',
    blackjack: 'Блекджек',
    coinflip: 'Орел чи зірка',
    minerush: 'MineRush',
    arena: 'Арена',
    aviator: 'Авіатор',
    leaders: 'Лідери',
    daily: 'Щоденний подарунок',
    cabinet: 'Кабінет',
    wallet: 'Гаманець',
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
    coinTitle: 'Орел чи зірка',
    coinSub: 'Вгадай бік монети та подвой ставку!',
    mrTitle: 'MineRush',
    mrSub: 'Сапер на зірки — відкрий поле і забери виграш!',
    arenaTitle: 'Арена',
    arenaSub: 'Спільний банк: що більша ставка — то більший шанс забрати все!',
    avTitle: 'Авіатор',
    avSub: 'Множник зростає — встигни забрати, поки літак не полетів!',
    soon: 'Скоро...',
    soonPvp: 'PvP турнір і командні челенджі',
    soonArcadeTitle: 'Незабаром',
    soonArcadeSub: 'Аркада та швидкі міні-ігри',
  },
  demo: {
    label: 'Демо-режим',
    hint: 'Нагороди лише візуальні — баланс, інвентар і статистика не змінюються',
    enable: 'Демо-режим',
    disable: 'Вийти з демо',
    resultNote: 'Демо — приз не зараховано',
    close: 'Зрозуміло',
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
    level: 'Рівень',
    xpLabel: 'Досвід',
    xpToNext: '{n} XP до наступного рівня',
    tasks: 'Завдання',
    taskDailyLogin: 'Щоденний вхід',
    taskOpenCase: 'Відкрити кейс',
    taskOpenPaidCase: 'Відкрити платний кейс',
    taskWinGame: 'Виграти в будь-якій міні-грі',
    taskClaimDaily: 'Забрати щоденний подарунок',
    taskPlayCoinflip: 'Зіграти в Орел/Зірка',
    taskPlayBlackjack: 'Зіграти в Блекджек',
    taskPlayMinerush: 'Зіграти в Mine Rush',
    taskPlayArena: 'Зробити ставку на Арені',
    taskPlayAviator: 'Зробити ставку в Авіаторі',
    taskWinCoinflip: 'Виграти в Орел/Зірка',
    taskWinBlackjack: 'Виграти в Блекджек',
    taskWinMinerush: 'Виграти в Mine Rush',
    taskWinArena: 'Виграти на Арені',
    taskWinAviator: 'Забрати в Авіаторі',
    tasksResetIn: 'Завдання оновляться через {t}',
    done: 'Готово',
  },
  rules: {
    button: 'Правила',
    title: 'Правила Metaluck',
    subtitle: 'Як працюють кейси, міні-ігри та вивід зірок',
    close: 'Зрозуміло',
    generalTitle: 'Загальне',
    generalBody:
      'Metaluck — міні-застосунок Telegram. Грайте на внутрішні зірки (★): відкривайте кейси, беріть участь у міні-іграх і накопичуйте баланс. Зірки всередині — ігрова валюта сервісу.',
    starsTitle: 'Зірки (★)',
    starsBody:
      'Баланс поповнюється через Telegram Stars і виграші. Зірки витрачаються на кейси та ставки. За активність нараховується XP і росте рівень у кабінеті.',
    casesTitle: 'Кейси',
    casesBody:
      'Оберіть кейс і відкрийте за зірки (або безкоштовний, коли доступний). Приз випадковий за вагами предметів. Подарунок потрапляє в історію; зіркові призи — на баланс.',
    dailyTitle: 'Щоденні нагороди',
    dailyBody:
      'Забирайте подарунок щодня по порядку: день 1 → 7, потім цикл знову. Безкоштовний кейс і колесо фортуни — раз на 7 днів.',
    gamesTitle: 'Міні-ігри',
    gamesIntro:
      'Усі міні-ігри йдуть на ваш баланс ★. Ставка списується одразу. Виграш зараховується на баланс. Є демо-режим без зміни балансу.',
    coinflipTitle: 'Орел чи Зірка',
    coinflipBody:
      'Оберіть сторону і ставку. Монета крутиться; вгадали — виграш ×2 (мінус комісія дому). Не вгадали — ставка згорає.',
    blackjackTitle: 'Блекджек',
    blackjackBody:
      'Класичний блекджек проти дилера. Мета — набрати більше за дилера, не перевищивши 21. При перемозі ставка повертається з коефіцієнтом; блекджек дає підвищений виграш.',
    minerushTitle: 'Mine Rush',
    minerushBody:
      'Поле 10×10 з мінами. Відкривайте безпечні клітинки, ставте прапорці. Можна забрати виграш раніше (cash out). На міну — ставка програна. Складність змінює число мін і множник.',
    arenaTitle: 'Арена',
    arenaBody:
      'Спільний банк: гравці ставлять у вікні раунду. Поле ділиться на сектори пропорційно ставкам. Кулька вказує переможця — він забирає банк (з комісією дому). Ставки від 1 ★.',
    aviatorTitle: 'Авіатор',
    aviatorBody:
      'Ставка приймається у вікні перед злетом. Після старту множник зростає щосекунди, але у випадковий момент літак відлітає. Встигли натиснути «Забрати» — отримуєте ставку × поточний множник; не встигли — ставка згорає. Auto Cashout забирає автоматично на обраному множнику. Точка крашу визначається на сервері до злету й не розкривається заздалегідь.',
    withdrawTitle: 'Вивід',
    withdrawBody:
      'Для виводу на балансі має бути щонайменше 100 ★. Мінімальна сума заявки — 100 ★. Заявка обробляється вручну; після створення сума списується. Демо не дає реального виводу.',
    demoTitle: 'Демо-режим',
    demoBody:
      'Умикається в лоббі ігор. Розіграші та анімації працюють, але баланс, інвентар, XP і вивід не змінюються.',
    fairTitle: 'Важливо',
    fairBody:
      'Результати випадкові. Сервіс утримує комісію дому. Не грайте на суми, які не готові втратити. Актуальні правила — у цьому розділі.',
  },
  admin: {
    title: 'Payment Hub',
    open: 'Адмінка Payment Hub',
    hint: 'Курси, спред, комісії, ліміти та операції. Зміни в БД без деплою.',
    save: 'Зберегти',
    refreshRates: 'Оновити курси',
    denied: 'Немає доступу',
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
    daysHoursMinutes: '{d} д {h} год {m} хв',
    error: 'Помилка',
    wheelTitle: 'Колесо фортуни',
    wheelReady: 'Безкоштовний спін готовий!',
    wheelOpen: 'Крутити',
    wheelHint: 'Безкоштовно раз на 7 днів',
    wheelSpin: 'Крутити колесо',
    wheelSpinning: 'Крутимо…',
    wheelCooldown: 'Зачекайте',
    wheelError: 'Не вдалося крутити колесо',
    couponsLabel: 'Купони',
    premiumWheelTitle: 'Преміум фортуна',
    premiumWheelHint: '1 купон або 25 Telegram Stars',
    premiumSpinCoupon: '🎟️ Купон ({n})',
    premiumSpinStars: '⭐ {n} Stars',
    wheelNoCoupons: 'Немає купонів',
    wheelPayTelegramOnly: 'Оплата Stars лише в Telegram',
    wheelPayCancelled: 'Оплату скасовано',
    wheelPayUsed: 'Обертання вже використано',
    wheelPayPending: 'Чекаємо підтвердження оплати…',
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
  wallet: {
    title: 'Гаманець',
    balances: 'Баланси',
    deposit: 'Поповнити',
    withdraw: 'Вивести',
    exchange: 'Обміняти',
    history: 'Історія',
    assetStars: 'Telegram Stars',
    assetTon: 'TON',
    assetUsdt: 'USDT TON',
    locked: 'У резерві',
    ledgerTitle: 'Операції',
    ledgerEmpty: 'Поки немає операцій',
    betCurrency: 'Валюта ставки',
    exchangeTitle: 'Обмін',
    exchangeFrom: 'Віддаєте',
    exchangeTo: 'Отримуєте',
    exchangeAmount: 'Сума',
    exchangeQuote: 'Розрахувати',
    exchangeConfirm: 'Обміняти',
    exchangeDone: 'Обмін виконано',
    exchangeSwap: 'Поміняти місцями',
    exchangeYouGet: 'До зарахування',
    exchangeFee: 'Комісія',
    exchangeRate: 'Курс',
    exchangeInvalidAmount: 'Некоректна сума',
    exchangeSamePair: 'Оберіть різні валюти',
    exchangeAvailable: 'Доступно',
    exchangeInsufficient: 'Недостатньо коштів — поповніть баланс',
    exchangeRealHint: 'Обмін за реальним балансом TON, USDT і Stars',
    exchangeDepositFirst: 'Поповнити криптою',
    exchangeWithdrawTon: 'Вивести TON',
    exchangeDoneHint: 'Баланс оновлено. Можна вивести TON або продовжити обмін.',
    cryptoDeposit: 'Крипто-депозит',
    cryptoAddress: 'Ваша адреса TON',
    cryptoCopy: 'Копіювати',
    cryptoCopied: 'Скопійовано',
    cryptoSync: 'Перевірити мережу',
    cryptoListening: 'Надішліть TON або USDT (TON) на цю адресу. Зарахування після підтверджень.',
    cryptoMin: 'Мінімум',
    cryptoDisabled: 'Крипто-гаманець тимчасово недоступний',
    cryptoDeposits: 'Вхідні',
    cryptoEmpty: 'Поки немає вхідних переказів',
    cryptoPickCurrency: 'Оберіть валюту для поповнення',
    cryptoChangeCurrency: '← Змінити валюту',
    cryptoSelected: 'Валюта',
    cryptoConfirmations: 'підтверджень',
    cryptoStatusPending: 'очікування',
    cryptoStatusConfirmed: 'зараховано',
    cryptoStatusFailed: 'помилка',
    cryptoWithdraw: 'Крипто-вивід',
    cryptoSection: 'Crypto',
    cryptoNetwork: 'Мережа',
    cryptoTopUp: 'Поповнити',
    cryptoCashOut: 'Вивести',
    cryptoWdPickCurrency: 'Оберіть валюту для виводу',
    cryptoWdDisabled: 'Вивід криптовалюти тимчасово недоступний',
    cryptoWdAddress: 'Адреса гаманця',
    cryptoWdAmount: 'Сума',
    cryptoWdAvailable: 'Доступно',
    cryptoWdContinue: 'Далі',
    cryptoWdBack: '← Назад',
    cryptoWdConfirmHint: 'Перевірте дані та підтвердіть вивід',
    cryptoWdConfirm: 'Підтвердити вивід',
    cryptoWdFee: 'Комісія мережі',
    cryptoWdNet: 'До отримання',
    cryptoWdTotal: 'Підсумок',
    cryptoWdDaily: 'Денний ліміт',
    cryptoWdHistory: 'Заявки на вивід',
    cryptoWdEmpty: 'Поки немає заявок',
    cryptoWdInvalidAmount: 'Некоректна сума',
    cryptoWdInvalidAddress: 'Вкажіть адресу гаманця',
    cryptoWdStatusPending: 'очікування',
    cryptoWdStatusProcessing: 'відправка',
    cryptoWdStatusCompleted: 'виконано',
    cryptoWdStatusFailed: 'помилка',
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
    tails: 'Зірка',
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
    mult: '×{n}',
    multLabel: 'Множник',
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
  av: {
    back: '‹ Ігри',
    history: 'Останні множники',
    historyEmpty: 'Раундів ще не було',
    flewAway: 'ВІДЛЕТІВ',
    startsIn: 'Зліт через',
    nextIn: 'Новий раунд через',
    secShort: ' с',
    waiting: 'Очікування раунду…',
    pot: 'Ставки',
    playersCount: 'Гравців',
    yourWin: 'Ваш виграш',
    empty: 'Зробіть ставку — раунд почнеться, і інші гравці зможуть приєднатися',
    you: 'Ви',
    autoShort: 'авто',
    autoCashout: 'Auto Cashout',
    autoOff: 'вимк',
    autoUp: 'Збільшити авто-кешаут',
    autoDown: 'Зменшити авто-кешаут',
    cashOut: 'ЗАБРАТИ',
    loading: 'Завантаження…',
    roundRunning: 'Раунд триває…',
    cashedOut: 'ЗАБРАЛИ НА {mult}',
    nextRound: 'Наступний раунд…',
    addBet: 'ДОДАТИ  •  {bet} ★',
    placeBet: 'СТАВКА  •  {bet} ★',
    betSize: 'Розмір ставки',
    loadError: 'Помилка завантаження',
    betError: 'Помилка ставки',
    cashError: 'Помилка кешауту',
    toastWin: 'Забрали на {mult} — +{amount} ★',
    toastLost: 'Відлетів на {mult} — ставка згоріла',
  },
  auth: {
    title: 'Вхід у Metaluck',
    subtitle: 'Кейси, міні-ігри та гаманець — з будь-якого пристрою',
    signingIn: 'Входимо…',
    googleError: 'Не вдалося увійти через Google',
    telegramError: 'Не вдалося увійти через Telegram',
    googleUnavailable: 'Google-вхід скоро буде доступний',
    telegramUnavailable: 'Telegram-вхід скоро буде доступний',
    miniAppHint: 'Вже в Telegram? Відкрийте міні-застосунок бота — вхід не потрібен.',
    continueTelegram: 'Увійти через Telegram',
    continueGoogle: 'Увійти через Google',
    continueTon: 'Увійти через TON Connect',
    continueEvm: 'Увійти через WalletConnect',
    walletError: 'Не вдалося увійти через гаманець',
    or: 'або',
    openBot: 'Відкрити бота в Telegram →',
    telegramWaiting: 'Підтвердіть вхід у боті — потім поверніться сюди',
    telegramExpired: 'Посилання входу застаріло. Натисніть «Увійти через Telegram» знову',
  },
  desktop: {
    brand: 'Metaluck',
    dashboard: 'Dashboard',
    profile: 'Профіль',
    wallet: 'Гаманець',
    games: 'Ігри',
    rewards: 'Нагороди',
    settings: 'Налаштування',
    logout: 'Вийти',
    notifications: 'Сповіщення',
    noNotifications: 'Поки немає сповіщень',
    welcome: 'Привіт, {name}',
    dashboardHint: 'Баланс, ігри та нагороди — в одному місці.',
    balance: 'Баланс',
    playNow: 'Грати',
    openRewards: 'Відкрити',
    openProfile: 'Кабінет',
  },
};

const en: Dict = {
  tabs: { games: 'Games', leaders: 'Leaders', daily: 'Daily', cabinet: 'Profile', wallet: 'Wallet' },
  header: {
    metaluck: 'Metaluck',
    cases: 'Cases',
    blackjack: 'Blackjack',
    coinflip: 'Eagle or Star',
    minerush: 'MineRush',
    arena: 'Arena',
    aviator: 'Aviator',
    leaders: 'Leaders',
    daily: 'Daily Gift',
    cabinet: 'Profile',
    wallet: 'Wallet',
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
    coinTitle: 'Eagle or Star',
    coinSub: 'Pick a side and double your bet!',
    mrTitle: 'MineRush',
    mrSub: 'Mines on stars — clear the field and cash out!',
    arenaTitle: 'Arena',
    arenaSub: 'Shared pot: the bigger your bet, the bigger your chance!',
    avTitle: 'Aviator',
    avSub: 'The multiplier climbs — cash out before the plane flies away!',
    soon: 'Soon...',
    soonPvp: 'PvP tournament and team challenges',
    soonArcadeTitle: 'Coming Soon',
    soonArcadeSub: 'Arcade and quick mini-games',
  },
  demo: {
    label: 'Demo mode',
    hint: 'Rewards are visual only — balance, inventory, and stats stay unchanged',
    enable: 'Demo mode',
    disable: 'Exit demo',
    resultNote: 'Demo — prize not credited',
    close: 'Got it',
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
    level: 'Level',
    xpLabel: 'XP',
    xpToNext: '{n} XP to next level',
    tasks: 'Tasks',
    taskDailyLogin: 'Daily login',
    taskOpenCase: 'Open a case',
    taskOpenPaidCase: 'Open a paid case',
    taskWinGame: 'Win any minigame',
    taskClaimDaily: 'Claim the daily gift',
    taskPlayCoinflip: 'Play Eagle or Star',
    taskPlayBlackjack: 'Play Blackjack',
    taskPlayMinerush: 'Play Mine Rush',
    taskPlayArena: 'Place an Arena bet',
    taskPlayAviator: 'Place an Aviator bet',
    taskWinCoinflip: 'Win Eagle or Star',
    taskWinBlackjack: 'Win Blackjack',
    taskWinMinerush: 'Win Mine Rush',
    taskWinArena: 'Win in Arena',
    taskWinAviator: 'Cash out in Aviator',
    tasksResetIn: 'Tasks refresh in {t}',
    done: 'Done',
  },
  rules: {
    button: 'Rules',
    title: 'Metaluck Rules',
    subtitle: 'How cases, mini-games, and withdrawals work',
    close: 'Got it',
    generalTitle: 'Overview',
    generalBody:
      'Metaluck is a Telegram Mini App. Play with in-app stars (★): open cases, join mini-games, and grow your balance. Stars inside the app are the service’s game currency.',
    starsTitle: 'Stars (★)',
    starsBody:
      'Top up via Telegram Stars or wins. Spend stars on cases and bets. Activity earns XP and levels in your profile.',
    casesTitle: 'Cases',
    casesBody:
      'Pick a case and open it for stars (or a free case when available). Prizes are random by item weights. Gifts go to history; star prizes credit your balance.',
    dailyTitle: 'Daily rewards',
    dailyBody:
      'Claim a gift every day in order: day 1 → 7, then the cycle restarts. Free case and fortune wheel — once every 7 days.',
    gamesTitle: 'Mini-games',
    gamesIntro:
      'All mini-games use your ★ balance. The bet is taken immediately; wins are credited back. Demo mode shows the flow without changing balance.',
    coinflipTitle: 'Eagle or Star',
    coinflipBody:
      'Pick a side and bet. The coin spins; correct call pays ×2 (minus house edge). Wrong call loses the bet.',
    blackjackTitle: 'Blackjack',
    blackjackBody:
      'Classic blackjack vs the dealer. Beat the dealer without going over 21. Wins pay with a multiplier; blackjack pays extra.',
    minerushTitle: 'Mine Rush',
    minerushBody:
      'A 10×10 field with mines. Reveal safe cells, place flags, cash out early, or clear the board. Hit a mine and the bet is lost. Difficulty changes mine count and multipliers.',
    arenaTitle: 'Arena',
    arenaBody:
      'Shared pot: players bet during the round window. The wheel is split by bet size. The ball picks a winner who takes the pot (minus house fee). Bets from 1 ★.',
    aviatorTitle: 'Aviator',
    aviatorBody:
      'Bets are accepted in the window before take-off. Once the plane starts, the multiplier climbs every second — but at a random moment it flies away. Hit "Cash out" in time and you get your bet × the current multiplier; too late and the bet is lost. Auto Cashout collects automatically at your chosen multiplier. The crash point is decided on the server before take-off and is never revealed in advance.',
    withdrawTitle: 'Withdrawals',
    withdrawBody:
      'You need at least 100 ★ on your balance to withdraw. Minimum order amount is 100 ★. Requests are processed manually; the amount is deducted when you submit. Demo mode has no real withdrawals.',
    demoTitle: 'Demo mode',
    demoBody:
      'Toggle it in the games lobby. Animations run, but balance, inventory, XP, and withdrawals stay unchanged.',
    fairTitle: 'Important',
    fairBody:
      'Outcomes are random. The house takes a fee on bets. Only play with amounts you can afford to lose. Current rules are always in this section.',
  },
  admin: {
    title: 'Payment Hub',
    open: 'Payment Hub Admin',
    hint: 'Rates, spread, fees, limits and ops. Changes persist in DB without redeploy.',
    save: 'Save',
    refreshRates: 'Refresh rates',
    denied: 'Access denied',
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
    daysHoursMinutes: '{d}d {h}h {m}m',
    error: 'Error',
    wheelTitle: 'Wheel of Fortune',
    wheelReady: 'Free spin is ready!',
    wheelOpen: 'Spin',
    wheelHint: 'Free once every 7 days',
    wheelSpin: 'Spin the wheel',
    wheelSpinning: 'Spinning…',
    wheelCooldown: 'Please wait',
    wheelError: 'Could not spin the wheel',
    couponsLabel: 'Coupons',
    premiumWheelTitle: 'Premium Fortune',
    premiumWheelHint: '1 coupon or 25 Telegram Stars',
    premiumSpinCoupon: '🎟️ Coupon ({n})',
    premiumSpinStars: '⭐ {n} Stars',
    wheelNoCoupons: 'No coupons',
    wheelPayTelegramOnly: 'Stars payment only in Telegram',
    wheelPayCancelled: 'Payment cancelled',
    wheelPayUsed: 'Spin already used',
    wheelPayPending: 'Waiting for payment…',
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
  wallet: {
    title: 'Wallet',
    balances: 'Balances',
    deposit: 'Deposit',
    withdraw: 'Withdraw',
    exchange: 'Exchange',
    history: 'History',
    assetStars: 'Telegram Stars',
    assetTon: 'TON',
    assetUsdt: 'USDT TON',
    locked: 'Reserved',
    ledgerTitle: 'Activity',
    ledgerEmpty: 'No activity yet',
    betCurrency: 'Bet currency',
    exchangeTitle: 'Exchange',
    exchangeFrom: 'From',
    exchangeTo: 'To',
    exchangeAmount: 'Amount',
    exchangeQuote: 'Get quote',
    exchangeConfirm: 'Exchange',
    exchangeDone: 'Exchange complete',
    exchangeSwap: 'Swap',
    exchangeYouGet: 'You receive',
    exchangeFee: 'Fee',
    exchangeRate: 'Rate',
    exchangeInvalidAmount: 'Invalid amount',
    exchangeSamePair: 'Pick different currencies',
    exchangeAvailable: 'Available',
    exchangeInsufficient: 'Insufficient balance — deposit first',
    exchangeRealHint: 'Exchange uses your real TON, USDT and Stars balances',
    exchangeDepositFirst: 'Deposit crypto',
    exchangeWithdrawTon: 'Withdraw TON',
    exchangeDoneHint: 'Balance updated. Withdraw TON or keep exchanging.',
    cryptoDeposit: 'Crypto deposit',
    cryptoAddress: 'Your TON address',
    cryptoCopy: 'Copy',
    cryptoCopied: 'Copied',
    cryptoSync: 'Check network',
    cryptoListening: 'Send TON or USDT (TON) to this address. Credited after confirmations.',
    cryptoMin: 'Minimum',
    cryptoDisabled: 'Crypto wallet is temporarily unavailable',
    cryptoDeposits: 'Incoming',
    cryptoEmpty: 'No incoming transfers yet',
    cryptoPickCurrency: 'Choose a currency to deposit',
    cryptoChangeCurrency: '← Change currency',
    cryptoSelected: 'Currency',
    cryptoConfirmations: 'confirmations',
    cryptoStatusPending: 'pending',
    cryptoStatusConfirmed: 'confirmed',
    cryptoStatusFailed: 'failed',
    cryptoWithdraw: 'Crypto withdraw',
    cryptoSection: 'Crypto',
    cryptoNetwork: 'Network',
    cryptoTopUp: 'Deposit',
    cryptoCashOut: 'Withdraw',
    cryptoWdPickCurrency: 'Choose a currency to withdraw',
    cryptoWdDisabled: 'Crypto withdrawals are temporarily unavailable',
    cryptoWdAddress: 'Wallet address',
    cryptoWdAmount: 'Amount',
    cryptoWdAvailable: 'Available',
    cryptoWdContinue: 'Continue',
    cryptoWdBack: '← Back',
    cryptoWdConfirmHint: 'Review details and confirm the withdrawal',
    cryptoWdConfirm: 'Confirm withdrawal',
    cryptoWdFee: 'Network fee',
    cryptoWdNet: 'You receive',
    cryptoWdTotal: 'Total',
    cryptoWdDaily: 'Daily limit',
    cryptoWdHistory: 'Withdrawals',
    cryptoWdEmpty: 'No withdrawals yet',
    cryptoWdInvalidAmount: 'Invalid amount',
    cryptoWdInvalidAddress: 'Enter a wallet address',
    cryptoWdStatusPending: 'pending',
    cryptoWdStatusProcessing: 'processing',
    cryptoWdStatusCompleted: 'completed',
    cryptoWdStatusFailed: 'failed',
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
    heads: 'Eagle',
    tails: 'Star',
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
    mult: '{n}x',
    multLabel: 'Multiplier',
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
  av: {
    back: '‹ Games',
    history: 'Recent multipliers',
    historyEmpty: 'No rounds yet',
    flewAway: 'FLEW AWAY',
    startsIn: 'Take-off in',
    nextIn: 'Next round in',
    secShort: 's',
    waiting: 'Waiting for round…',
    pot: 'Total bets',
    playersCount: 'Players',
    yourWin: 'Your win',
    empty: 'Place a bet — the round will start and others can join',
    you: 'You',
    autoShort: 'auto',
    autoCashout: 'Auto Cashout',
    autoOff: 'off',
    autoUp: 'Increase auto cashout',
    autoDown: 'Decrease auto cashout',
    cashOut: 'CASH OUT',
    loading: 'Loading…',
    roundRunning: 'Round in progress…',
    cashedOut: 'CASHED OUT AT {mult}',
    nextRound: 'Next round…',
    addBet: 'ADD  •  {bet} ★',
    placeBet: 'BET  •  {bet} ★',
    betSize: 'Bet size',
    loadError: 'Failed to load',
    betError: 'Bet error',
    cashError: 'Cash out error',
    toastWin: 'Cashed out at {mult} — +{amount} ★',
    toastLost: 'Flew away at {mult} — bet lost',
  },
  auth: {
    title: 'Sign in to Metaluck',
    subtitle: 'Cases, mini-games, and wallet — from any device',
    signingIn: 'Signing in…',
    googleError: 'Google sign-in failed',
    telegramError: 'Telegram sign-in failed',
    googleUnavailable: 'Google sign-in coming soon',
    telegramUnavailable: 'Telegram sign-in coming soon',
    miniAppHint: 'Already in Telegram? Open the mini app — no sign-in needed.',
    continueTelegram: 'Continue with Telegram',
    continueGoogle: 'Continue with Google',
    continueTon: 'Continue with TON Connect',
    continueEvm: 'Continue with WalletConnect',
    walletError: 'Wallet sign-in failed',
    or: 'or',
    openBot: 'Open bot in Telegram →',
    telegramWaiting: 'Confirm in the bot — then return here',
    telegramExpired: 'Login link expired. Tap Continue with Telegram again',
  },
  desktop: {
    brand: 'Metaluck',
    dashboard: 'Dashboard',
    profile: 'Profile',
    wallet: 'Wallet',
    games: 'Games',
    rewards: 'Rewards',
    settings: 'Settings',
    logout: 'Log out',
    notifications: 'Notifications',
    noNotifications: 'No notifications yet',
    welcome: 'Hey, {name}',
    dashboardHint: 'Balance, games, and rewards in one place.',
    balance: 'Balance',
    playNow: 'Play now',
    openRewards: 'Open',
    openProfile: 'Open profile',
  },
};

const es: Dict = {
  tabs: { games: 'Juegos', leaders: 'Líderes', daily: 'Diario', cabinet: 'Perfil', wallet: 'Monedero' },
  header: {
    metaluck: 'Metaluck',
    cases: 'Cajas',
    blackjack: 'Blackjack',
    coinflip: 'Águila o estrella',
    minerush: 'MineRush',
    arena: 'Arena',
    aviator: 'Aviator',
    leaders: 'Líderes',
    daily: 'Regalo diario',
    cabinet: 'Perfil',
    wallet: 'Monedero',
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
    coinTitle: 'Águila o estrella',
    coinSub: '¡Elige un lado y duplica tu apuesta!',
    mrTitle: 'MineRush',
    mrSub: 'Buscaminas con estrellas — ¡abre el campo y cobra!',
    arenaTitle: 'Arena',
    arenaSub: 'Bote compartido: ¡más apuesta, más chance de llevarte todo!',
    avTitle: 'Aviator',
    avSub: 'El multiplicador sube: ¡retira antes de que el avión se vaya!',
    soon: 'Pronto...',
    soonPvp: 'Torneo PvP y desafíos de equipo',
    soonArcadeTitle: 'Próximamente',
    soonArcadeSub: 'Arcade y minijuegos rápidos',
  },
  demo: {
    label: 'Modo demo',
    hint: 'Las recompensas son solo visuales: saldo, inventario y estadísticas no cambian',
    enable: 'Modo demo',
    disable: 'Salir del demo',
    resultNote: 'Demo — premio no acreditado',
    close: 'Entendido',
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
    level: 'Nivel',
    xpLabel: 'XP',
    xpToNext: '{n} XP para el siguiente nivel',
    tasks: 'Misiones',
    taskDailyLogin: 'Entrada diaria',
    taskOpenCase: 'Abrir una caja',
    taskOpenPaidCase: 'Abrir una caja de pago',
    taskWinGame: 'Ganar cualquier minijuego',
    taskClaimDaily: 'Reclamar el regalo diario',
    taskPlayCoinflip: 'Jugar Águila o estrella',
    taskPlayBlackjack: 'Jugar Blackjack',
    taskPlayMinerush: 'Jugar Mine Rush',
    taskPlayArena: 'Apostar en la Arena',
    taskPlayAviator: 'Apostar en Aviator',
    taskWinCoinflip: 'Ganar Águila o estrella',
    taskWinBlackjack: 'Ganar Blackjack',
    taskWinMinerush: 'Ganar Mine Rush',
    taskWinArena: 'Ganar en la Arena',
    taskWinAviator: 'Retirar en Aviator',
    tasksResetIn: 'Las misiones se renuevan en {t}',
    done: 'Hecho',
  },
  rules: {
    button: 'Reglas',
    title: 'Reglas de Metaluck',
    subtitle: 'Cómo funcionan los casos, minijuegos y retiros',
    close: 'Entendido',
    generalTitle: 'General',
    generalBody:
      'Metaluck es una Mini App de Telegram. Juega con estrellas internas (★): abre casos, participa en minijuegos y acumula saldo. Las estrellas son la moneda del servicio.',
    starsTitle: 'Estrellas (★)',
    starsBody:
      'Recarga con Telegram Stars o ganancias. Gasta estrellas en casos y apuestas. La actividad da XP y sube el nivel en el perfil.',
    casesTitle: 'Casos',
    casesBody:
      'Elige un caso y ábrelo con estrellas (o uno gratis si está disponible). El premio es aleatorio según pesos. Los regalos van al historial; las estrellas al saldo.',
    dailyTitle: 'Recompensas diarias',
    dailyBody:
      'Reclama un regalo cada día en orden: día 1 → 7 y el ciclo se reinicia. Caja gratis y rueda de la fortuna — cada 7 días.',
    gamesTitle: 'Minijuegos',
    gamesIntro:
      'Todos usan tu saldo ★. La apuesta se descuenta al instante; las ganancias se acreditan. El modo demo no cambia el saldo.',
    coinflipTitle: 'Águila o estrella',
    coinflipBody:
      'Elige cara y apuesta. La moneda gira; si aciertas cobras ×2 (menos comisión). Si fallas, pierdes la apuesta.',
    blackjackTitle: 'Blackjack',
    blackjackBody:
      'Blackjack clásico contra el crupier. Superar al crupier sin pasar de 21. Las victorias pagan con multiplicador; el blackjack paga más.',
    minerushTitle: 'Mine Rush',
    minerushBody:
      'Campo 10×10 con minas. Revela casillas seguras, marca banderas, retira antes (cash out) o limpia el tablero. Si pisas una mina, pierdes. La dificultad cambia minas y multiplicadores.',
    arenaTitle: 'Arena',
    arenaBody:
      'Bote compartido: apuestas en la ventana de la ronda. El campo se divide por tamaño de apuesta. La bola elige al ganador del bote (con comisión). Desde 1 ★.',
    aviatorTitle: 'Aviator',
    aviatorBody:
      'Las apuestas se aceptan en la ventana previa al despegue. Tras el arranque el multiplicador sube cada segundo, pero en un momento aleatorio el avión se va. Si pulsas «Retirar» a tiempo recibes tu apuesta × el multiplicador actual; si no, pierdes la apuesta. Auto Cashout retira automáticamente en el multiplicador elegido. El punto de caída se decide en el servidor antes del despegue y nunca se revela por adelantado.',
    withdrawTitle: 'Retiros',
    withdrawBody:
      'Necesitas al menos 100 ★ en el saldo. El mínimo por solicitud es 100 ★. Se procesa manualmente; el importe se descuenta al crear la solicitud. El demo no permite retiros reales.',
    demoTitle: 'Modo demo',
    demoBody:
      'Actívalo en el lobby. Las animaciones funcionan, pero saldo, inventario, XP y retiros no cambian.',
    fairTitle: 'Importante',
    fairBody:
      'Los resultados son aleatorios. Hay comisión de la casa. No juegues con dinero que no puedas perder. Las reglas vigentes están aquí.',
  },
  admin: {
    title: 'Payment Hub',
    open: 'Admin Payment Hub',
    hint: 'Tipos, spread, comisiones, límites y operaciones. Cambios en BD sin redeploy.',
    save: 'Guardar',
    refreshRates: 'Actualizar tipos',
    denied: 'Acceso denegado',
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
    daysHoursMinutes: '{d} d {h} h {m} min',
    error: 'Error',
    wheelTitle: 'Rueda de la fortuna',
    wheelReady: '¡Giro gratis listo!',
    wheelOpen: 'Girar',
    wheelHint: 'Gratis una vez cada 7 días',
    wheelSpin: 'Girar la rueda',
    wheelSpinning: 'Girando…',
    wheelCooldown: 'Espera',
    wheelError: 'No se pudo girar la rueda',
    couponsLabel: 'Cupones',
    premiumWheelTitle: 'Fortuna premium',
    premiumWheelHint: '1 cupón o 25 Telegram Stars',
    premiumSpinCoupon: '🎟️ Cupón ({n})',
    premiumSpinStars: '⭐ {n} Stars',
    wheelNoCoupons: 'Sin cupones',
    wheelPayTelegramOnly: 'Pago con Stars solo en Telegram',
    wheelPayCancelled: 'Pago cancelado',
    wheelPayUsed: 'Giro ya usado',
    wheelPayPending: 'Esperando el pago…',
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
  wallet: {
    title: 'Monedero',
    balances: 'Saldos',
    deposit: 'Ingresar',
    withdraw: 'Retirar',
    exchange: 'Cambiar',
    history: 'Historial',
    assetStars: 'Telegram Stars',
    assetTon: 'TON',
    assetUsdt: 'USDT TON',
    locked: 'Reservado',
    ledgerTitle: 'Actividad',
    ledgerEmpty: 'Aún no hay movimientos',
    betCurrency: 'Moneda de apuesta',
    exchangeTitle: 'Cambio',
    exchangeFrom: 'Desde',
    exchangeTo: 'Hacia',
    exchangeAmount: 'Importe',
    exchangeQuote: 'Calcular',
    exchangeConfirm: 'Cambiar',
    exchangeDone: 'Cambio completado',
    exchangeSwap: 'Intercambiar',
    exchangeYouGet: 'Recibes',
    exchangeFee: 'Comisión',
    exchangeRate: 'Tipo',
    exchangeInvalidAmount: 'Importe no válido',
    exchangeSamePair: 'Elige monedas distintas',
    exchangeAvailable: 'Disponible',
    exchangeInsufficient: 'Saldo insuficiente — deposita primero',
    exchangeRealHint: 'El cambio usa tu saldo real de TON, USDT y Stars',
    exchangeDepositFirst: 'Depositar crypto',
    exchangeWithdrawTon: 'Retirar TON',
    exchangeDoneHint: 'Saldo actualizado. Retira TON o sigue cambiando.',
    cryptoDeposit: 'Depósito crypto',
    cryptoAddress: 'Tu dirección TON',
    cryptoCopy: 'Copiar',
    cryptoCopied: 'Copiado',
    cryptoSync: 'Comprobar red',
    cryptoListening: 'Envía TON o USDT (TON) a esta dirección. Se acredita tras confirmaciones.',
    cryptoMin: 'Mínimo',
    cryptoDisabled: 'Monedero crypto temporalmente no disponible',
    cryptoDeposits: 'Entrantes',
    cryptoEmpty: 'Aún no hay transferencias',
    cryptoPickCurrency: 'Elige la moneda a depositar',
    cryptoChangeCurrency: '← Cambiar moneda',
    cryptoSelected: 'Moneda',
    cryptoConfirmations: 'confirmaciones',
    cryptoStatusPending: 'pendiente',
    cryptoStatusConfirmed: 'confirmado',
    cryptoStatusFailed: 'fallido',
    cryptoWithdraw: 'Retiro crypto',
    cryptoSection: 'Crypto',
    cryptoNetwork: 'Red',
    cryptoTopUp: 'Depositar',
    cryptoCashOut: 'Retirar',
    cryptoWdPickCurrency: 'Elige la moneda a retirar',
    cryptoWdDisabled: 'Los retiros crypto no están disponibles',
    cryptoWdAddress: 'Dirección de billetera',
    cryptoWdAmount: 'Cantidad',
    cryptoWdAvailable: 'Disponible',
    cryptoWdContinue: 'Continuar',
    cryptoWdBack: '← Atrás',
    cryptoWdConfirmHint: 'Revisa los datos y confirma el retiro',
    cryptoWdConfirm: 'Confirmar retiro',
    cryptoWdFee: 'Comisión de red',
    cryptoWdNet: 'Recibes',
    cryptoWdTotal: 'Total',
    cryptoWdDaily: 'Límite diario',
    cryptoWdHistory: 'Retiros',
    cryptoWdEmpty: 'Aún no hay retiros',
    cryptoWdInvalidAmount: 'Cantidad inválida',
    cryptoWdInvalidAddress: 'Introduce una dirección',
    cryptoWdStatusPending: 'pendiente',
    cryptoWdStatusProcessing: 'procesando',
    cryptoWdStatusCompleted: 'completado',
    cryptoWdStatusFailed: 'fallido',
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
    heads: 'Águila',
    tails: 'Estrella',
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
    mult: '×{n}',
    multLabel: 'Multiplicador',
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
  av: {
    back: '‹ Juegos',
    history: 'Últimos multiplicadores',
    historyEmpty: 'Aún no hay rondas',
    flewAway: '¡SE FUE!',
    startsIn: 'Despegue en',
    nextIn: 'Nueva ronda en',
    secShort: ' s',
    waiting: 'Esperando ronda…',
    pot: 'Apuestas',
    playersCount: 'Jugadores',
    yourWin: 'Tu ganancia',
    empty: 'Haz una apuesta: la ronda empezará y otros podrán unirse',
    you: 'Tú',
    autoShort: 'auto',
    autoCashout: 'Auto Cashout',
    autoOff: 'apag',
    autoUp: 'Aumentar auto retiro',
    autoDown: 'Reducir auto retiro',
    cashOut: 'RETIRAR',
    loading: 'Cargando…',
    roundRunning: 'Ronda en curso…',
    cashedOut: 'RETIRADO EN {mult}',
    nextRound: 'Próxima ronda…',
    addBet: 'AÑADIR  •  {bet} ★',
    placeBet: 'APOSTAR  •  {bet} ★',
    betSize: 'Tamaño de apuesta',
    loadError: 'Error al cargar',
    betError: 'Error de apuesta',
    cashError: 'Error al retirar',
    toastWin: 'Retirado en {mult} — +{amount} ★',
    toastLost: 'Se fue en {mult} — apuesta perdida',
  },
  auth: {
    title: 'Entrar en Metaluck',
    subtitle: 'Casos, minijuegos y monedero — desde cualquier dispositivo',
    signingIn: 'Entrando…',
    googleError: 'No se pudo entrar con Google',
    telegramError: 'No se pudo entrar con Telegram',
    googleUnavailable: 'El acceso con Google estará disponible pronto',
    telegramUnavailable: 'El acceso con Telegram estará disponible pronto',
    miniAppHint: '¿Ya estás en Telegram? Abre la mini app — no hace falta entrar.',
    continueTelegram: 'Entrar con Telegram',
    continueGoogle: 'Entrar con Google',
    continueTon: 'Entrar con TON Connect',
    continueEvm: 'Entrar con WalletConnect',
    walletError: 'No se pudo entrar con la billetera',
    or: 'o',
    openBot: 'Abrir el bot en Telegram →',
    telegramWaiting: 'Confirma en el bot — luego vuelve aquí',
    telegramExpired: 'El enlace caducó. Pulsa Entrar con Telegram de nuevo',
  },
  desktop: {
    brand: 'Metaluck',
    dashboard: 'Dashboard',
    profile: 'Perfil',
    wallet: 'Monedero',
    games: 'Juegos',
    rewards: 'Recompensas',
    settings: 'Ajustes',
    logout: 'Salir',
    notifications: 'Notificaciones',
    noNotifications: 'Sin notificaciones',
    welcome: 'Hola, {name}',
    dashboardHint: 'Saldo, juegos y recompensas en un solo lugar.',
    balance: 'Saldo',
    playNow: 'Jugar',
    openRewards: 'Abrir',
    openProfile: 'Perfil',
  },
};

const de: Dict = {
  tabs: { games: 'Spiele', leaders: 'Rangliste', daily: 'Täglich', cabinet: 'Profil', wallet: 'Wallet' },
  header: {
    metaluck: 'Metaluck',
    cases: 'Cases',
    blackjack: 'Blackjack',
    coinflip: 'Adler oder Stern',
    minerush: 'MineRush',
    arena: 'Arena',
    aviator: 'Aviator',
    leaders: 'Rangliste',
    daily: 'Tägliches Geschenk',
    cabinet: 'Profil',
    wallet: 'Wallet',
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
    coinTitle: 'Adler oder Stern',
    coinSub: 'Wähle eine Seite und verdopple deinen Einsatz!',
    mrTitle: 'MineRush',
    mrSub: 'Minenspiel um Sterne — öffne das Feld und cash out!',
    arenaTitle: 'Arena',
    arenaSub: 'Gemeinsamer Pot: je höher der Einsatz, desto größer die Chance!',
    avTitle: 'Aviator',
    avSub: 'Der Multiplikator steigt — kassiere, bevor das Flugzeug wegfliegt!',
    soon: 'Bald...',
    soonPvp: 'PvP-Turnier und Team-Challenges',
    soonArcadeTitle: 'Demnächst',
    soonArcadeSub: 'Arcade und schnelle Minispiele',
  },
  demo: {
    label: 'Demo-Modus',
    hint: 'Belohnungen nur visuell — Guthaben, Inventar und Statistik bleiben unverändert',
    enable: 'Demo-Modus',
    disable: 'Demo beenden',
    resultNote: 'Demo — Preis nicht gutgeschrieben',
    close: 'Verstanden',
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
    level: 'Level',
    xpLabel: 'XP',
    xpToNext: '{n} XP bis zum nächsten Level',
    tasks: 'Aufgaben',
    taskDailyLogin: 'Täglicher Login',
    taskOpenCase: 'Eine Case öffnen',
    taskOpenPaidCase: 'Eine bezahlte Case öffnen',
    taskWinGame: 'Ein beliebiges Minispiel gewinnen',
    taskClaimDaily: 'Tägliches Geschenk abholen',
    taskPlayCoinflip: 'Adler oder Stern spielen',
    taskPlayBlackjack: 'Blackjack spielen',
    taskPlayMinerush: 'Mine Rush spielen',
    taskPlayArena: 'In der Arena setzen',
    taskPlayAviator: 'Bei Aviator setzen',
    taskWinCoinflip: 'Adler oder Stern gewinnen',
    taskWinBlackjack: 'Blackjack gewinnen',
    taskWinMinerush: 'Mine Rush gewinnen',
    taskWinArena: 'In der Arena gewinnen',
    taskWinAviator: 'Bei Aviator kassieren',
    tasksResetIn: 'Aufgaben erneuern in {t}',
    done: 'Erledigt',
  },
  rules: {
    button: 'Regeln',
    title: 'Metaluck-Regeln',
    subtitle: 'Fälle, Minispiele und Auszahlungen kurz erklärt',
    close: 'Verstanden',
    generalTitle: 'Allgemein',
    generalBody:
      'Metaluck ist eine Telegram-Mini-App. Spiele mit internen Sternen (★): öffne Cases, spiele Minispiele und baue dein Guthaben auf. Sterne im App sind die Spielwährung.',
    starsTitle: 'Sterne (★)',
    starsBody:
      'Aufladen über Telegram Stars oder Gewinne. Sterne für Cases und Einsätze. Aktivität gibt XP und Level im Profil.',
    casesTitle: 'Cases',
    casesBody:
      'Wähle ein Case und öffne es für Sterne (oder gratis, wenn verfügbar). Preise sind zufällig nach Gewichten. Geschenke in die Historie; Sternpreise aufs Guthaben.',
    dailyTitle: 'Tägliche Belohnungen',
    dailyBody:
      'Hol dir jeden Tag der Reihe nach ein Geschenk: Tag 1 → 7, danach startet der Zyklus neu. Free-Case und Glücksrad — einmal alle 7 Tage.',
    gamesTitle: 'Minispiele',
    gamesIntro:
      'Alle Minispiele nutzen dein ★-Guthaben. Einsatz wird sofort abgezogen; Gewinne gutgeschrieben. Demo ändert das Guthaben nicht.',
    coinflipTitle: 'Adler oder Stern',
    coinflipBody:
      'Seite und Einsatz wählen. Münze dreht sich; richtig = ×2 (abzüglich Hausgebühr). Falsch = Einsatz verloren.',
    blackjackTitle: 'Blackjack',
    blackjackBody:
      'Klassisches Blackjack gegen den Dealer. Mehr als der Dealer, ohne über 21. Gewinne mit Multiplikator; Blackjack zahlt extra.',
    minerushTitle: 'Mine Rush',
    minerushBody:
      '10×10-Feld mit Minen. Sichere Felder öffnen, Flaggen setzen, früh auszahlen oder Feld räumen. Mine = Einsatz verloren. Schwierigkeit ändert Minenzahl und Multiplikatoren.',
    arenaTitle: 'Arena',
    arenaBody:
      'Gemeinsamer Pot: Einsätze im Rundfenster. Feld nach Einsatzgröße geteilt. Die Kugel wählt den Gewinner des Pots (mit Hausgebühr). Ab 1 ★.',
    aviatorTitle: 'Aviator',
    aviatorBody:
      'Einsätze werden im Fenster vor dem Start angenommen. Nach dem Abheben steigt der Multiplikator jede Sekunde, doch zu einem zufälligen Zeitpunkt fliegt das Flugzeug davon. Wer rechtzeitig „Kassieren" drückt, erhält Einsatz × aktueller Multiplikator; sonst ist der Einsatz verloren. Auto Cashout kassiert automatisch beim gewählten Multiplikator. Der Absturzpunkt wird vor dem Start auf dem Server bestimmt und nie vorab verraten.',
    withdrawTitle: 'Auszahlung',
    withdrawBody:
      'Mindestens 100 ★ auf dem Guthaben nötig. Mindestbetrag pro Antrag: 100 ★. Manuelle Bearbeitung; Betrag wird bei Antrag abgezogen. Demo ohne echte Auszahlung.',
    demoTitle: 'Demo-Modus',
    demoBody:
      'Im Spiele-Lobby aktivierbar. Animationen laufen, aber Guthaben, Inventar, XP und Auszahlung bleiben unverändert.',
    fairTitle: 'Wichtig',
    fairBody:
      'Ergebnisse sind zufällig. Das Haus nimmt Gebühren. Spiele nur mit Beträgen, die du verlieren kannst. Aktuelle Regeln stehen hier.',
  },
  admin: {
    title: 'Payment Hub',
    open: 'Payment Hub Admin',
    hint: 'Kurse, Spread, Gebühren, Limits und Ops. Änderungen in der DB ohne Redeploy.',
    save: 'Speichern',
    refreshRates: 'Kurse aktualisieren',
    denied: 'Kein Zugriff',
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
    daysHoursMinutes: '{d} T. {h} Std. {m} Min.',
    error: 'Fehler',
    wheelTitle: 'Glücksrad',
    wheelReady: 'Gratis-Dreh ist bereit!',
    wheelOpen: 'Drehen',
    wheelHint: 'Gratis einmal alle 7 Tage',
    wheelSpin: 'Rad drehen',
    wheelSpinning: 'Dreht…',
    wheelCooldown: 'Bitte warten',
    wheelError: 'Rad konnte nicht gedreht werden',
    couponsLabel: 'Coupons',
    premiumWheelTitle: 'Premium-Glücksrad',
    premiumWheelHint: '1 Coupon oder 25 Telegram Stars',
    premiumSpinCoupon: '🎟️ Coupon ({n})',
    premiumSpinStars: '⭐ {n} Stars',
    wheelNoCoupons: 'Keine Coupons',
    wheelPayTelegramOnly: 'Stars-Zahlung nur in Telegram',
    wheelPayCancelled: 'Zahlung abgebrochen',
    wheelPayUsed: 'Dreh bereits genutzt',
    wheelPayPending: 'Warte auf Zahlung…',
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
  wallet: {
    title: 'Wallet',
    balances: 'Salden',
    deposit: 'Einzahlen',
    withdraw: 'Auszahlen',
    exchange: 'Tauschen',
    history: 'Verlauf',
    assetStars: 'Telegram Stars',
    assetTon: 'TON',
    assetUsdt: 'USDT TON',
    locked: 'Reserviert',
    ledgerTitle: 'Aktivität',
    ledgerEmpty: 'Noch keine Aktivität',
    betCurrency: 'Einsatzwährung',
    exchangeTitle: 'Tausch',
    exchangeFrom: 'Von',
    exchangeTo: 'Nach',
    exchangeAmount: 'Betrag',
    exchangeQuote: 'Kurs holen',
    exchangeConfirm: 'Tauschen',
    exchangeDone: 'Tausch abgeschlossen',
    exchangeSwap: 'Tauschen',
    exchangeYouGet: 'Sie erhalten',
    exchangeFee: 'Gebühr',
    exchangeRate: 'Kurs',
    exchangeInvalidAmount: 'Ungültiger Betrag',
    exchangeSamePair: 'Andere Währungen wählen',
    exchangeAvailable: 'Verfügbar',
    exchangeInsufficient: 'Unzureichendes Guthaben — zuerst einzahlen',
    exchangeRealHint: 'Tausch nutzt dein reales TON-, USDT- und Stars-Guthaben',
    exchangeDepositFirst: 'Crypto einzahlen',
    exchangeWithdrawTon: 'TON auszahlen',
    exchangeDoneHint: 'Guthaben aktualisiert. TON auszahlen oder weiter tauschen.',
    cryptoDeposit: 'Crypto-Einzahlung',
    cryptoAddress: 'Deine TON-Adresse',
    cryptoCopy: 'Kopieren',
    cryptoCopied: 'Kopiert',
    cryptoSync: 'Netz prüfen',
    cryptoListening: 'Sende TON oder USDT (TON) an diese Adresse. Gutschrift nach Bestätigungen.',
    cryptoMin: 'Minimum',
    cryptoDisabled: 'Crypto-Wallet vorübergehend nicht verfügbar',
    cryptoDeposits: 'Eingehend',
    cryptoEmpty: 'Noch keine eingehenden Transfers',
    cryptoPickCurrency: 'Wähle die Einzahlungswährung',
    cryptoChangeCurrency: '← Währung wechseln',
    cryptoSelected: 'Währung',
    cryptoConfirmations: 'Bestätigungen',
    cryptoStatusPending: 'ausstehend',
    cryptoStatusConfirmed: 'bestätigt',
    cryptoStatusFailed: 'fehlgeschlagen',
    cryptoWithdraw: 'Crypto-Auszahlung',
    cryptoSection: 'Crypto',
    cryptoNetwork: 'Netzwerk',
    cryptoTopUp: 'Einzahlen',
    cryptoCashOut: 'Auszahlen',
    cryptoWdPickCurrency: 'Wähle die Auszahlungswährung',
    cryptoWdDisabled: 'Crypto-Auszahlungen sind vorübergehend nicht verfügbar',
    cryptoWdAddress: 'Wallet-Adresse',
    cryptoWdAmount: 'Betrag',
    cryptoWdAvailable: 'Verfügbar',
    cryptoWdContinue: 'Weiter',
    cryptoWdBack: '← Zurück',
    cryptoWdConfirmHint: 'Prüfe die Daten und bestätige die Auszahlung',
    cryptoWdConfirm: 'Auszahlung bestätigen',
    cryptoWdFee: 'Netzwerkgebühr',
    cryptoWdNet: 'Du erhältst',
    cryptoWdTotal: 'Summe',
    cryptoWdDaily: 'Tageslimit',
    cryptoWdHistory: 'Auszahlungen',
    cryptoWdEmpty: 'Noch keine Auszahlungen',
    cryptoWdInvalidAmount: 'Ungültiger Betrag',
    cryptoWdInvalidAddress: 'Wallet-Adresse eingeben',
    cryptoWdStatusPending: 'ausstehend',
    cryptoWdStatusProcessing: 'in Bearbeitung',
    cryptoWdStatusCompleted: 'abgeschlossen',
    cryptoWdStatusFailed: 'fehlgeschlagen',
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
    heads: 'Adler',
    tails: 'Stern',
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
    mult: '×{n}',
    multLabel: 'Multiplikator',
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
  av: {
    back: '‹ Spiele',
    history: 'Letzte Multiplikatoren',
    historyEmpty: 'Noch keine Runden',
    flewAway: 'WEGGEFLOGEN',
    startsIn: 'Start in',
    nextIn: 'Neue Runde in',
    secShort: ' Sek.',
    waiting: 'Warte auf Runde…',
    pot: 'Einsätze',
    playersCount: 'Spieler',
    yourWin: 'Dein Gewinn',
    empty: 'Setze einen Einsatz — die Runde startet und andere können mitmachen',
    you: 'Du',
    autoShort: 'auto',
    autoCashout: 'Auto Cashout',
    autoOff: 'aus',
    autoUp: 'Auto-Cashout erhöhen',
    autoDown: 'Auto-Cashout verringern',
    cashOut: 'KASSIEREN',
    loading: 'Lädt…',
    roundRunning: 'Runde läuft…',
    cashedOut: 'KASSIERT BEI {mult}',
    nextRound: 'Nächste Runde…',
    addBet: 'ERHÖHEN  •  {bet} ★',
    placeBet: 'SETZEN  •  {bet} ★',
    betSize: 'Einsatzgröße',
    loadError: 'Laden fehlgeschlagen',
    betError: 'Einsatzfehler',
    cashError: 'Fehler beim Kassieren',
    toastWin: 'Kassiert bei {mult} — +{amount} ★',
    toastLost: 'Weggeflogen bei {mult} — Einsatz verloren',
  },
  auth: {
    title: 'Bei Metaluck anmelden',
    subtitle: 'Fälle, Minispiele und Wallet — auf jedem Gerät',
    signingIn: 'Anmeldung…',
    googleError: 'Google-Anmeldung fehlgeschlagen',
    telegramError: 'Telegram-Anmeldung fehlgeschlagen',
    googleUnavailable: 'Google-Anmeldung kommt bald',
    telegramUnavailable: 'Telegram-Anmeldung kommt bald',
    miniAppHint: 'Schon in Telegram? Öffne die Mini-App — keine Anmeldung nötig.',
    continueTelegram: 'Mit Telegram anmelden',
    continueGoogle: 'Mit Google anmelden',
    continueTon: 'Mit TON Connect anmelden',
    continueEvm: 'Mit WalletConnect anmelden',
    walletError: 'Wallet-Anmeldung fehlgeschlagen',
    or: 'oder',
    openBot: 'Bot in Telegram öffnen →',
    telegramWaiting: 'Im Bot bestätigen — dann hierher zurückkehren',
    telegramExpired: 'Link abgelaufen. Erneut «Mit Telegram anmelden» tippen',
  },
  desktop: {
    brand: 'Metaluck',
    dashboard: 'Dashboard',
    profile: 'Profil',
    wallet: 'Wallet',
    games: 'Spiele',
    rewards: 'Belohnungen',
    settings: 'Einstellungen',
    logout: 'Abmelden',
    notifications: 'Benachrichtigungen',
    noNotifications: 'Noch keine Benachrichtigungen',
    welcome: 'Hallo, {name}',
    dashboardHint: 'Guthaben, Spiele und Belohnungen an einem Ort.',
    balance: 'Guthaben',
    playNow: 'Spielen',
    openRewards: 'Öffnen',
    openProfile: 'Profil',
  },
};

export const DICTS: Record<AppLanguage, Dict> = { ru, uk, en, es, de };
