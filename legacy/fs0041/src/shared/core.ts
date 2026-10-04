declare const chrome: {
  runtime: {
    onInstalled: { addListener(callback: () => void): void };
    onMessage: {
      addListener(callback: (
        message: unknown,
        sender: unknown,
        sendResponse: (response?: unknown) => void
      ) => boolean | void): void;
    };
  };
  storage: {
    local: {
      get(key: string): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
    };
    onChanged: {
      addListener(callback: (changes: Record<string, { newValue?: unknown }>, areaName: string) => void): void;
    };
  };
  tabs: {
    query(queryInfo: { active?: boolean; currentWindow?: boolean }): Promise<Array<{ id?: number }>>;
    sendMessage(tabId: number, message: unknown): Promise<unknown>;
  };
};

namespace FSCore {
  export const SCHEMA_VERSION = 4;
  export const STORAGE_KEY = 'fs.settings.v1';
  export const PROFILE_STORE_KEY = 'fs.profiles.v1';
  export const PROFILE_STORE_SCHEMA_VERSION = 1;
  export const PORTABLE_EXPORT_FORMAT = 'feed-switcher-local-profiles';
  export const MAX_FAVORITES = 24;
  export const MAX_RECENTS = 8;
  export const MESSAGE_APPLY_SETTINGS = 'FS_APPLY_SETTINGS';
  export const MESSAGE_PING = 'FS_PING';

  export type FeatureFlagName =
    | 'API_ENHANCED_SEARCH'
    | 'DERIVED_METRICS'
    | 'AI_TOPIC_TAGGING'
    | 'HISTORICAL_TRACKING'
    | 'CREATOR_RANKINGS'
    | 'ALERTS';

  export type FeatureFlags = Record<FeatureFlagName, boolean>;

  export type TopicId =
    | 'history'
    | 'technology'
    | 'finance'
    | 'military'
    | 'politics'
    | 'film'
    | 'celebrity'
    | 'science'
    | 'business'
    | 'geopolitics'
    | 'gaming'
    | 'custom';

  export type LanguageCode = 'any' | 'zh-Hans' | 'zh-Hant' | 'en' | 'ja' | 'ko' | 'es' | 'de' | 'fr';
  export type RegionCode = 'GLOBAL' | 'US' | 'GB' | 'JP' | 'KR' | 'DE' | 'CA' | 'AU' | 'IN' | 'TW' | 'HK' | 'SG';
  export type TimeRange = '24H' | '7D' | '30D' | 'ANY';
  export type SortMode = 'RELEVANCE' | 'LATEST' | 'VIEW_COUNT';

  export interface DiscoverySettings {
    active: boolean;
    topic: TopicId;
    customTopic: string;
    language: LanguageCode;
    region: RegionCode;
    timeRange: TimeRange;
    sort: SortMode;
  }

  export interface Settings {
    schemaVersion: number;
    enabled: boolean;
    gate: 'LEVEL_A' | 'LEVEL_B' | 'LEVEL_C';
    flags: FeatureFlags;
    discovery: DiscoverySettings;
  }

  export interface SavedProfile {
    id: string;
    name: string;
    discovery: DiscoverySettings;
    createdAt: string;
    updatedAt: string;
  }

  export interface RecentChannel {
    key: string;
    discovery: DiscoverySettings;
    lastUsedAt: string;
  }

  export interface ProfileStore {
    schemaVersion: number;
    favorites: SavedProfile[];
    recent: RecentChannel[];
  }

  export interface PortableExport {
    format: typeof PORTABLE_EXPORT_FORMAT;
    version: 1;
    exportedAt: string;
    settings: Settings;
    profiles: ProfileStore;
  }

  export interface ApplySettingsMessage {
    type: typeof MESSAGE_APPLY_SETTINGS;
    settings: Settings;
  }

  export interface PingMessage {
    type: typeof MESSAGE_PING;
  }

  export const TOPICS: ReadonlyArray<{ id: TopicId; label: string; icon: string }> = Object.freeze([
    { id: 'history', label: '历史', icon: '◷' },
    { id: 'technology', label: '科技', icon: '⌘' },
    { id: 'finance', label: '金融', icon: '↗' },
    { id: 'military', label: '军事', icon: '◇' },
    { id: 'politics', label: '政治', icon: '◎' },
    { id: 'film', label: '影视', icon: '▶' },
    { id: 'celebrity', label: '明星', icon: '☆' },
    { id: 'science', label: '科学', icon: '⚗' },
    { id: 'business', label: '商业', icon: '▦' },
    { id: 'geopolitics', label: '地缘', icon: '⌖' },
    { id: 'gaming', label: '游戏', icon: '✦' },
    { id: 'custom', label: '自定义', icon: '+' }
  ]);

  export const LANGUAGES: ReadonlyArray<{ code: LanguageCode; label: string }> = Object.freeze([
    { code: 'any', label: '不限语言' },
    { code: 'zh-Hans', label: '中文（简体）' },
    { code: 'zh-Hant', label: '中文（繁體）' },
    { code: 'en', label: 'English' },
    { code: 'ja', label: '日本語' },
    { code: 'ko', label: '한국어' },
    { code: 'es', label: 'Español' },
    { code: 'de', label: 'Deutsch' },
    { code: 'fr', label: 'Français' }
  ]);

  export const REGIONS: ReadonlyArray<{ code: RegionCode; label: string }> = Object.freeze([
    { code: 'GLOBAL', label: '全球' },
    { code: 'US', label: '美国' },
    { code: 'GB', label: '英国' },
    { code: 'JP', label: '日本' },
    { code: 'KR', label: '韩国' },
    { code: 'DE', label: '德国' },
    { code: 'CA', label: '加拿大' },
    { code: 'AU', label: '澳大利亚' },
    { code: 'IN', label: '印度' },
    { code: 'TW', label: '台湾' },
    { code: 'HK', label: '香港' },
    { code: 'SG', label: '新加坡' }
  ]);

  export const TIME_RANGES: ReadonlyArray<{ value: TimeRange; label: string }> = Object.freeze([
    { value: '24H', label: '24小时' },
    { value: '7D', label: '7天' },
    { value: '30D', label: '30天' },
    { value: 'ANY', label: '不限' }
  ]);

  export const SORT_MODES: ReadonlyArray<{ value: SortMode; label: string }> = Object.freeze([
    { value: 'RELEVANCE', label: '相关度' },
    { value: 'LATEST', label: '近期' },
    { value: 'VIEW_COUNT', label: '热门' }
  ]);

  export const DEFAULT_FEATURE_FLAGS: FeatureFlags = Object.freeze({
    API_ENHANCED_SEARCH: false,
    DERIVED_METRICS: false,
    AI_TOPIC_TAGGING: false,
    HISTORICAL_TRACKING: false,
    CREATOR_RANKINGS: false,
    ALERTS: false
  });

  export function createDefaultDiscoverySettings(): DiscoverySettings {
    return {
      active: false,
      topic: 'history',
      customTopic: '',
      language: 'any',
      region: 'GLOBAL',
      timeRange: '7D',
      sort: 'RELEVANCE'
    };
  }

  export function createDefaultSettings(): Settings {
    return {
      schemaVersion: SCHEMA_VERSION,
      enabled: true,
      gate: 'LEVEL_A',
      flags: { ...DEFAULT_FEATURE_FLAGS },
      discovery: createDefaultDiscoverySettings()
    };
  }

  function includesValue<T extends string>(items: ReadonlyArray<{ [key: string]: unknown }>, key: string, value: unknown): value is T {
    return typeof value === 'string' && items.some((item) => item[key] === value);
  }

  export function normalizeDiscoverySettings(input: unknown): DiscoverySettings {
    const defaults = createDefaultDiscoverySettings();
    if (!input || typeof input !== 'object') return defaults;

    const candidate = input as Partial<DiscoverySettings>;
    const customTopic = typeof candidate.customTopic === 'string'
      ? candidate.customTopic.trim().slice(0, 80)
      : '';

    return {
      active: candidate.active === true,
      topic: includesValue<TopicId>(TOPICS, 'id', candidate.topic) ? candidate.topic : defaults.topic,
      customTopic,
      language: candidate.language === ('zh' as unknown as LanguageCode)
        ? 'zh-Hans'
        : includesValue<LanguageCode>(LANGUAGES, 'code', candidate.language) ? candidate.language : defaults.language,
      region: includesValue<RegionCode>(REGIONS, 'code', candidate.region) ? candidate.region : defaults.region,
      timeRange: includesValue<TimeRange>(TIME_RANGES, 'value', candidate.timeRange) ? candidate.timeRange : defaults.timeRange,
      sort: includesValue<SortMode>(SORT_MODES, 'value', candidate.sort) ? candidate.sort : defaults.sort
    };
  }

  export function normalizeSettings(input: unknown): Settings {
    const defaults = createDefaultSettings();
    if (!input || typeof input !== 'object') return defaults;

    const candidate = input as Partial<Settings>;
    const gate = candidate.gate === 'LEVEL_B' || candidate.gate === 'LEVEL_C'
      ? candidate.gate
      : 'LEVEL_A';

    const rawFlags = candidate.flags && typeof candidate.flags === 'object'
      ? candidate.flags as Partial<FeatureFlags>
      : {};

    const flags = { ...DEFAULT_FEATURE_FLAGS };
    (Object.keys(flags) as FeatureFlagName[]).forEach((key) => {
      flags[key] = rawFlags[key] === true;
    });

    return {
      schemaVersion: SCHEMA_VERSION,
      enabled: candidate.enabled !== false,
      gate,
      flags,
      discovery: normalizeDiscoverySettings(candidate.discovery)
    };
  }

  export function isApplySettingsMessage(input: unknown): input is ApplySettingsMessage {
    if (!input || typeof input !== 'object') return false;
    const candidate = input as Partial<ApplySettingsMessage>;
    return candidate.type === MESSAGE_APPLY_SETTINGS && !!candidate.settings;
  }

  export function topicLabel(discovery: DiscoverySettings): string {
    if (discovery.topic === 'custom') return discovery.customTopic || '自定义';
    return TOPICS.find((item) => item.id === discovery.topic)?.label || '历史';
  }

  export function optionLabel<T extends string>(items: ReadonlyArray<{ label: string } & Record<string, unknown>>, key: string, value: T): string {
    return items.find((item) => item[key] === value)?.label || value;
  }

  export function discoverySummary(discovery: DiscoverySettings): string {
    const parts = [
      topicLabel(discovery),
      optionLabel(LANGUAGES, 'code', discovery.language),
      optionLabel(REGIONS, 'code', discovery.region),
      optionLabel(TIME_RANGES, 'value', discovery.timeRange),
      optionLabel(SORT_MODES, 'value', discovery.sort)
    ];
    return parts.join(' · ');
  }

  export type QueryEngineMode = 'NATIVE_RELEVANCE' | 'NATIVE_POPULARITY' | 'FRESH_WINDOW';

  export interface QueryPlan {
    topicLabel: string;
    searchTerm: string;
    queryText: string;
    url: string;
    mode: QueryEngineMode;
    effectiveTimeRange: TimeRange;
    appliedAfterDate: string | null;
    regionHint: RegionCode | null;
    notes: string[];
  }

  type TopicTerms = Record<Exclude<TopicId, 'custom'>, Record<LanguageCode, string>>;

  const TOPIC_QUERY_TERMS: TopicTerms = Object.freeze({
    history: {
      any: 'history', 'zh-Hans': '历史', 'zh-Hant': '歷史', en: 'history', ja: '歴史', ko: '역사', es: 'historia', de: 'Geschichte', fr: 'histoire'
    },
    technology: {
      any: 'technology', 'zh-Hans': '科技', 'zh-Hant': '科技', en: 'technology', ja: 'テクノロジー', ko: '기술', es: 'tecnología', de: 'Technologie', fr: 'technologie'
    },
    finance: {
      any: 'finance markets', 'zh-Hans': '金融 市场', 'zh-Hant': '金融 市場', en: 'finance markets', ja: '金融 市場', ko: '금융 시장', es: 'finanzas mercados', de: 'Finanzen Märkte', fr: 'finance marchés'
    },
    military: {
      any: 'military defense', 'zh-Hans': '军事 国防', 'zh-Hant': '軍事 國防', en: 'military defense', ja: '軍事 防衛', ko: '군사 국방', es: 'militar defensa', de: 'Militär Verteidigung', fr: 'militaire défense'
    },
    politics: {
      any: 'politics', 'zh-Hans': '政治', 'zh-Hant': '政治', en: 'politics', ja: '政治', ko: '정치', es: 'política', de: 'Politik', fr: 'politique'
    },
    film: {
      any: 'film television', 'zh-Hans': '电影 电视剧', 'zh-Hant': '電影 電視劇', en: 'film television', ja: '映画 テレビ', ko: '영화 드라마', es: 'cine televisión', de: 'Film Fernsehen', fr: 'cinéma télévision'
    },
    celebrity: {
      any: 'celebrity entertainment', 'zh-Hans': '明星 娱乐', 'zh-Hant': '明星 娛樂', en: 'celebrity entertainment', ja: '芸能 エンタメ', ko: '연예 엔터테인먼트', es: 'celebridades entretenimiento', de: 'Promis Unterhaltung', fr: 'célébrités divertissement'
    },
    science: {
      any: 'science', 'zh-Hans': '科学', 'zh-Hant': '科學', en: 'science', ja: '科学', ko: '과학', es: 'ciencia', de: 'Wissenschaft', fr: 'science'
    },
    business: {
      any: 'business', 'zh-Hans': '商业', 'zh-Hant': '商業', en: 'business', ja: 'ビジネス', ko: '비즈니스', es: 'negocios', de: 'Wirtschaft', fr: 'business'
    },
    geopolitics: {
      any: 'geopolitics', 'zh-Hans': '地缘政治', 'zh-Hant': '地緣政治', en: 'geopolitics', ja: '地政学', ko: '지정학', es: 'geopolítica', de: 'Geopolitik', fr: 'géopolitique'
    },
    gaming: {
      any: 'gaming', 'zh-Hans': '游戏', 'zh-Hant': '遊戲', en: 'gaming', ja: 'ゲーム', ko: '게임', es: 'videojuegos', de: 'Gaming', fr: 'jeux vidéo'
    }
  });

  const FRESH_WINDOW_FALLBACK: TimeRange = '30D';
  const YOUTUBE_POPULARITY_SP = 'CAMSAhAB';

  function isoDateDaysAgo(now: Date, daysAgo: number): string {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    date.setUTCDate(date.getUTCDate() - daysAgo);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  export function queryTerm(discovery: DiscoverySettings): string {
    if (discovery.topic === 'custom') return discovery.customTopic.trim();
    return TOPIC_QUERY_TERMS[discovery.topic][discovery.language] || TOPIC_QUERY_TERMS[discovery.topic].any;
  }

  export function effectiveTimeRange(discovery: DiscoverySettings): TimeRange {
    if (discovery.sort === 'LATEST' && discovery.timeRange === 'ANY') return FRESH_WINDOW_FALLBACK;
    return discovery.timeRange;
  }

  export function afterDateForRange(range: TimeRange, now: Date = new Date()): string | null {
    if (range === '24H') return isoDateDaysAgo(now, 1);
    if (range === '7D') return isoDateDaysAgo(now, 7);
    if (range === '30D') return isoDateDaysAgo(now, 30);
    return null;
  }

  export function buildQueryPlan(discoveryInput: unknown, now: Date = new Date()): QueryPlan {
    const discovery = normalizeDiscoverySettings(discoveryInput);
    const term = queryTerm(discovery) || topicLabel(discovery);
    const range = effectiveTimeRange(discovery);
    const afterDate = afterDateForRange(range, now);
    const queryText = afterDate ? `${term} after:${afterDate}` : term;
    const params = new URLSearchParams();
    params.set('search_query', queryText);

    if (discovery.region !== 'GLOBAL') params.set('gl', discovery.region);
    if (discovery.sort === 'VIEW_COUNT') params.set('sp', YOUTUBE_POPULARITY_SP);

    const mode: QueryEngineMode = discovery.sort === 'VIEW_COUNT'
      ? 'NATIVE_POPULARITY'
      : discovery.sort === 'LATEST'
        ? 'FRESH_WINDOW'
        : 'NATIVE_RELEVANCE';

    const notes: string[] = [];
    if (discovery.language !== 'any') {
      notes.push('Level A 的语言是“内容语言偏好”，通过本地化主题词增强相关性，并非硬过滤；高相关的其他语言内容仍可能出现。');
    }
    if (discovery.region !== 'GLOBAL') {
      notes.push(`地区使用 YouTube 原生 gl=${discovery.region} 提示，不伪造物理位置，账号/IP 仍可能影响结果。`);
    }
    if (discovery.language === 'zh-Hans' && (discovery.region === 'TW' || discovery.region === 'HK')) {
      notes.push('当前为“简体中文 + 繁体中文地区”跨组合，结果中出现繁体内容属于预期。');
    }
    if (discovery.language === 'zh-Hant' && discovery.region === 'SG') {
      notes.push('当前为“繁體中文 + 新加坡”跨组合，结果中出现简体或英文内容的概率会升高。');
    }
    if (discovery.timeRange === '24H') {
      notes.push('YouTube 原生搜索的日期运算符按“日期”工作，因此 24 小时是近似时间窗。');
    }
    if (discovery.sort === 'LATEST') {
      notes.push(discovery.timeRange === 'ANY'
        ? 'YouTube 2026 已移除严格按上传时间排序；“近期”自动限定近 30 天候选池。'
        : 'YouTube 2026 已移除严格按上传时间排序；“近期”只缩窄所选时间窗，不承诺时间倒序。');
    }
    if (discovery.sort === 'VIEW_COUNT') {
      notes.push('“热门”使用 YouTube 当前 Popularity 搜索排序；它不等同于纯播放量倒序。');
    }
    if (discovery.topic === 'custom' && discovery.language !== 'any') {
      notes.push('自定义 Topic 保留用户原文，不自动翻译。');
    }

    return {
      topicLabel: topicLabel(discovery),
      searchTerm: term,
      queryText,
      url: `https://www.youtube.com/results?${params.toString()}`,
      mode,
      effectiveTimeRange: range,
      appliedAfterDate: afterDate,
      regionHint: discovery.region === 'GLOBAL' ? null : discovery.region,
      notes
    };
  }

  export function queryModeLabel(mode: QueryEngineMode): string {
    if (mode === 'NATIVE_POPULARITY') return 'YouTube 热门';
    if (mode === 'FRESH_WINDOW') return '近期内容时间窗';
    return 'YouTube 相关度';
  }

  function safeTimestamp(input: unknown, fallback: string): string {
    if (typeof input !== 'string' || input.length > 40) return fallback;
    const date = new Date(input);
    return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
  }

  function safeProfileName(input: unknown, discovery: DiscoverySettings): string {
    if (typeof input === 'string') {
      const trimmed = input.trim().replace(/\s+/g, ' ').slice(0, 40);
      if (trimmed) return trimmed;
    }
    return suggestedProfileName(discovery);
  }

  function safeProfileId(input: unknown, fallback: string): string {
    if (typeof input !== 'string') return fallback;
    const cleaned = input.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    return cleaned || fallback;
  }

  export function createDefaultProfileStore(): ProfileStore {
    return { schemaVersion: PROFILE_STORE_SCHEMA_VERSION, favorites: [], recent: [] };
  }

  export function discoveryFingerprint(discoveryInput: unknown): string {
    const d = normalizeDiscoverySettings(discoveryInput);
    return [d.topic, d.customTopic.toLocaleLowerCase(), d.language, d.region, d.timeRange, d.sort].join('|');
  }

  export function suggestedProfileName(discoveryInput: unknown): string {
    const d = normalizeDiscoverySettings(discoveryInput);
    const parts = [
      topicLabel(d),
      optionLabel(LANGUAGES, 'code', d.language),
      optionLabel(REGIONS, 'code', d.region)
    ];
    return parts.join(' · ').slice(0, 40);
  }

  export function normalizeProfileStore(input: unknown, now: Date = new Date()): ProfileStore {
    const defaults = createDefaultProfileStore();
    if (!input || typeof input !== 'object') return defaults;
    const candidate = input as Partial<ProfileStore>;
    const nowIso = now.toISOString();
    const seenProfiles = new Set<string>();
    const seenProfileIds = new Set<string>();
    const favorites: SavedProfile[] = [];

    if (Array.isArray(candidate.favorites)) {
      for (let index = 0; index < candidate.favorites.length && favorites.length < MAX_FAVORITES; index += 1) {
        const raw = candidate.favorites[index];
        if (!raw || typeof raw !== 'object') continue;
        const item = raw as Partial<SavedProfile>;
        const discovery = normalizeDiscoverySettings(item.discovery);
        const fingerprint = discoveryFingerprint(discovery);
        if (seenProfiles.has(fingerprint)) continue;
        seenProfiles.add(fingerprint);
        const fallbackId = `profile-${index + 1}`;
        let id = safeProfileId(item.id, fallbackId);
        if (seenProfileIds.has(id)) id = `${fallbackId}-${index + 1}`;
        seenProfileIds.add(id);
        const createdAt = safeTimestamp(item.createdAt, nowIso);
        favorites.push({
          id,
          name: safeProfileName(item.name, discovery),
          discovery: { ...discovery, active: false },
          createdAt,
          updatedAt: safeTimestamp(item.updatedAt, createdAt)
        });
      }
    }

    const seenRecent = new Set<string>();
    const recent: RecentChannel[] = [];
    if (Array.isArray(candidate.recent)) {
      for (const raw of candidate.recent) {
        if (recent.length >= MAX_RECENTS) break;
        if (!raw || typeof raw !== 'object') continue;
        const item = raw as Partial<RecentChannel>;
        const discovery = normalizeDiscoverySettings(item.discovery);
        const key = discoveryFingerprint(discovery);
        if (seenRecent.has(key)) continue;
        seenRecent.add(key);
        recent.push({
          key,
          discovery: { ...discovery, active: false },
          lastUsedAt: safeTimestamp(item.lastUsedAt, nowIso)
        });
      }
    }

    recent.sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt));
    return { schemaVersion: PROFILE_STORE_SCHEMA_VERSION, favorites, recent };
  }

  export function createProfileId(now: Date = new Date(), entropy = Math.random()): string {
    const time = now.getTime().toString(36);
    const salt = Math.floor(Math.max(0, Math.min(0.999999999, entropy)) * 0xFFFFFF).toString(36).padStart(5, '0');
    return `fs-${time}-${salt}`;
  }

  export function addFavoriteProfile(
    storeInput: unknown,
    discoveryInput: unknown,
    nameInput: unknown,
    now: Date = new Date(),
    id = createProfileId(now)
  ): ProfileStore {
    const store = normalizeProfileStore(storeInput, now);
    const discovery = { ...normalizeDiscoverySettings(discoveryInput), active: false };
    const fingerprint = discoveryFingerprint(discovery);
    const timestamp = now.toISOString();
    const existing = store.favorites.find((item) => discoveryFingerprint(item.discovery) === fingerprint);
    const profile: SavedProfile = existing
      ? { ...existing, name: safeProfileName(nameInput, discovery), discovery, updatedAt: timestamp }
      : { id: safeProfileId(id, createProfileId(now, 0)), name: safeProfileName(nameInput, discovery), discovery, createdAt: timestamp, updatedAt: timestamp };

    const favorites = [profile, ...store.favorites.filter((item) => discoveryFingerprint(item.discovery) !== fingerprint)]
      .slice(0, MAX_FAVORITES);
    return { ...store, favorites };
  }

  export function removeFavoriteProfile(storeInput: unknown, profileId: string, now: Date = new Date()): ProfileStore {
    const store = normalizeProfileStore(storeInput, now);
    return { ...store, favorites: store.favorites.filter((item) => item.id !== profileId) };
  }

  export function recordRecentChannel(storeInput: unknown, discoveryInput: unknown, now: Date = new Date()): ProfileStore {
    const store = normalizeProfileStore(storeInput, now);
    const discovery = { ...normalizeDiscoverySettings(discoveryInput), active: false };
    const key = discoveryFingerprint(discovery);
    const entry: RecentChannel = { key, discovery, lastUsedAt: now.toISOString() };
    const recent = [entry, ...store.recent.filter((item) => item.key !== key)].slice(0, MAX_RECENTS);
    return { ...store, recent };
  }

  export function buildPortableExport(settingsInput: unknown, profileStoreInput: unknown, now: Date = new Date()): PortableExport {
    return {
      format: PORTABLE_EXPORT_FORMAT,
      version: 1,
      exportedAt: now.toISOString(),
      settings: normalizeSettings(settingsInput),
      profiles: normalizeProfileStore(profileStoreInput, now)
    };
  }

  export function parsePortableExport(input: unknown, now: Date = new Date()): PortableExport | null {
    if (!input || typeof input !== 'object') return null;
    const candidate = input as Partial<PortableExport>;
    if (candidate.format !== PORTABLE_EXPORT_FORMAT || candidate.version !== 1) return null;
    if (!candidate.settings || typeof candidate.settings !== 'object') return null;
    if (!candidate.profiles || typeof candidate.profiles !== 'object') return null;
    return buildPortableExport(candidate.settings, candidate.profiles, now);
  }

}

(globalThis as unknown as { FSCore: typeof FSCore }).FSCore = FSCore;
