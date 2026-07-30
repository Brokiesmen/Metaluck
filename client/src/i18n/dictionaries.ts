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
    soonArcadeTitle: 'Coming Soon',
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
    soonArcadeTitle: 'Coming Soon',
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
    mrSub: 'Buscaminas con estrellas — abre el campo y cobra!',
    arenaTitle: 'Arena',
    arenaSub: 'Bote compartido: ¡más apuesta, más chance de llevarte todo!',
    soon: 'Pronto...',
    soonPvp: 'Torneo PvP y desafíos de equipo',
    soonArcadeTitle: 'Coming Soon',
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
    soonArcadeTitle: 'Coming Soon',
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
  },
};

export const DICTS: Record<AppLanguage, Dict> = { ru, uk, en, es, de };
