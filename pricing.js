/**
 * Вайб-трип — общая логика кода поездки и расчёта стоимости (только фронт).
 * Формат кода: CC-Hotel-Food-Sea-Exc
 * CC: TH | TR | ID | AE | GE
 * Hotel: 1star | 3star | 5star | hostel
 * Food: AI | shop | noodle | cafe
 * Sea: 1line | 5min | bus
 * Exc: e0 | e2 | e5  (0 экскурсий | 1–2 | 5+)
 */
(function (global) {
  const COUNTRY_BASE = {
    TH: 98000,
    TR: 88000,
    ID: 115000,
    AE: 185000,
    GE: 72000,
  };

  const HOTEL_ADD = {
    '1star': 8000,
    '3star': 28000,
    '5star': 92000,
    hostel: -12000,
  };

  const FOOD_ADD = {
    AI: 52000,
    shop: 9500,
    noodle: 4200,
    cafe: 24000,
  };

  const SEA_ADD = {
    '1line': 31000,
    '5min': 14000,
    bus: 7500,
  };

  const EXC_ADD = {
    e0: 0,
    e2: 19500,
    e5: 48000,
  };

  const LABELS = {
    countries: {
      TH: { flag: '🇹🇭', name: 'Таиланд', joke: 'пляж, ананас, потерял паспорт' },
      TR: { flag: '🇹🇷', name: 'Турция', joke: 'шведский стол 4 раза в день' },
      ID: { flag: '🇮🇩', name: 'Бали', joke: 'йога, смузи, и всё равно работаю' },
      AE: { flag: '🇦🇪', name: 'Дубай', joke: 'сфоткать Бурдж Халифа и домой' },
      GE: { flag: '🇬🇪', name: 'Грузия', joke: 'хинкали, вино, хинкали' },
    },
    hotels: {
      '1star': { stars: '⭐️', joke: 'главное, чтоб кровать была' },
      '3star': { stars: '⭐️⭐️⭐️', joke: 'бассейн есть, и ладно' },
      '5star': { stars: '⭐️⭐️⭐️⭐️⭐️', joke: 'я же заслужил, ну' },
      hostel: { stars: '🏚', joke: 'новые друзья и клопы' },
    },
    food: {
      AI: { icon: '🍽', joke: 'еда каждые 40 минут' },
      shop: { icon: '🛒', joke: 'сыр, хлеб, и гордость' },
      noodle: { icon: '🍜', joke: 'зато сэкономил' },
      cafe: { icon: '🍣', joke: 'желудок — авантюрист' },
    },
    sea: {
      '1line': { icon: '🌊', joke: 'просыпаешься от волн' },
      '5min': { icon: '🚶', joke: 'терпимо' },
      bus: { icon: '🚌', joke: 'видишь море в окошечко автобуса' },
    },
    exc: {
      e0: { label: '0', joke: 'я отдыхать, а не бегать' },
      e2: { label: '1–2', joke: 'для галочки' },
      e5: { label: '5+', joke: 'я турист, а не овощ' },
    },
  };

  function calcTripPrice(parts) {
    const { country, hotel, food, sea, exc } = parts;
    const base = COUNTRY_BASE[country];
    if (base == null) return NaN;
    return Math.round(
      base +
        (HOTEL_ADD[hotel] || 0) +
        (FOOD_ADD[food] || 0) +
        (SEA_ADD[sea] || 0) +
        (EXC_ADD[exc] || 0)
    );
  }

  /** Собирает код поездки из частей */
  function encodeTripCode(parts) {
    return [parts.country, parts.hotel, parts.food, parts.sea, parts.exc].join('-');
  }

  /** Разбор кода из Дня 1 */
  function parseTripCode(code) {
    if (!code || typeof code !== 'string') return null;
    const trimmed = code.trim();
    const segments = trimmed.split('-').filter(Boolean);
    if (segments.length < 5) return null;
    const [country, hotel, food, sea, exc] = segments.slice(0, 5);
    if (!COUNTRY_BASE[country]) return null;
    if (!HOTEL_ADD[hotel]) return null;
    if (!FOOD_ADD[food]) return null;
    if (!SEA_ADD[sea]) return null;
    if (!EXC_ADD[exc]) return null;
    return { country, hotel, food, sea, exc };
  }

  function tripPriceFromCode(code) {
    const p = parseTripCode(code);
    if (!p) return NaN;
    return calcTripPrice(p);
  }

  /** Старт майской кампании (локальная дата устройства). */
  const CAMPAIGN_START = { year: 2026, month: 5, day: 2 };

  /**
   * Какой «день мини-приложений» уже открыт по календарю: 0 — до старта, 1 — только день 1, 2 — 1+2, 3 — все три.
   * После 3-го дня кампании доступны все дни.
   */
  function getMaxAppDayByCalendar() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(CAMPAIGN_START.year, CAMPAIGN_START.month - 1, CAMPAIGN_START.day);
    const diffDays = Math.round((today - start) / 86400000);
    if (diffDays < 0) return 0;
    return Math.min(3, diffDays + 1);
  }

  /** Параметры в URL, включающие тест (без учёта sessionStorage). */
  function isDebugUnlockFromSearch(search) {
    if (!search || typeof search !== 'string') return false;
    const q = new URLSearchParams(search.startsWith('?') ? search : '?' + search);
    return (
      q.get('debug') === '1' ||
      q.get('vibe_debug') === '1' ||
      q.get('test') === '1' ||
      q.get('preview') === '1'
    );
  }

  const SESSION_PREVIEW_KEY = 'vibeTrip_preview_all_days';

  /**
   * Обрабатывает ?preview=1, ?test=1, ?debug=1 — сохраняет режим «все дни» в sessionStorage вкладки.
   * ?preview=0 / ?debug=0 / ?test=0 — сбрасывает.
   */
  function activatePreviewFromUrl(search) {
    if (typeof sessionStorage === 'undefined') return;
    if (!search || typeof search !== 'string') return;
    const q = new URLSearchParams(search.startsWith('?') ? search : '?' + search);
    if (q.get('debug') === '0' || q.get('preview') === '0' || q.get('test') === '0' || q.get('vibe_debug') === '0') {
      try {
        sessionStorage.removeItem(SESSION_PREVIEW_KEY);
      } catch (_) {}
      return;
    }
    if (isDebugUnlockFromSearch(search)) {
      try {
        sessionStorage.setItem(SESSION_PREVIEW_KEY, '1');
      } catch (_) {}
    }
  }

  /** Календарь выключен: тест всех дней (URL или уже сохранённая сессия вкладки). */
  function isPreviewUnlock(search) {
    activatePreviewFromUrl(search);
    if (isDebugUnlockFromSearch(search)) return true;
    try {
      return sessionStorage.getItem(SESSION_PREVIEW_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  const STORAGE_KEYS = {
    day1: 'vibeTrip_day1',
    day2: 'vibeTrip_day2',
  };

  global.VibeTripPricing = {
    COUNTRY_BASE,
    HOTEL_ADD,
    FOOD_ADD,
    SEA_ADD,
    EXC_ADD,
    LABELS,
    CAMPAIGN_START,
    calcTripPrice,
    encodeTripCode,
    parseTripCode,
    tripPriceFromCode,
    getMaxAppDayByCalendar,
    isDebugUnlockFromSearch,
    activatePreviewFromUrl,
    isPreviewUnlock,
    STORAGE_KEYS,
  };
})(typeof window !== 'undefined' ? window : globalThis);
