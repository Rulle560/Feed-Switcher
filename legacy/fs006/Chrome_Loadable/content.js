"use strict";
var FSCore;
(function (FSCore) {
    FSCore.SCHEMA_VERSION = 4;
    FSCore.STORAGE_KEY = 'fs.settings.v1';
    FSCore.PROFILE_STORE_KEY = 'fs.profiles.v1';
    FSCore.PROFILE_STORE_SCHEMA_VERSION = 1;
    FSCore.PORTABLE_EXPORT_FORMAT = 'feed-switcher-local-profiles';
    FSCore.MAX_FAVORITES = 24;
    FSCore.MAX_RECENTS = 8;
    FSCore.MESSAGE_APPLY_SETTINGS = 'FS_APPLY_SETTINGS';
    FSCore.MESSAGE_PING = 'FS_PING';
    FSCore.MESSAGE_BACKEND_COMMAND = 'FS_BACKEND_COMMAND';
    FSCore.BACKEND_ACCOUNT_KEY = 'fs.backend-account.v1';
    FSCore.REMOTE_CONFIG_KEY = 'fs.remote-config.v1';
    FSCore.BACKEND_ORIGIN = 'http://127.0.0.1:8787';
    FSCore.BACKEND_ORIGIN_PATTERN = `${FSCore.BACKEND_ORIGIN}/*`;
    FSCore.PRIVACY_CONSENT_KEY = 'fs.privacy-consent.v1';
    FSCore.PRIVACY_POLICY_VERSION = '2026-09-21';
    FSCore.CLIENT_VERSION = '0.6.0';
    FSCore.TOPICS = Object.freeze([
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
    FSCore.LANGUAGES = Object.freeze([
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
    FSCore.REGIONS = Object.freeze([
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
    FSCore.TIME_RANGES = Object.freeze([
        { value: '24H', label: '24小时' },
        { value: '7D', label: '7天' },
        { value: '30D', label: '30天' },
        { value: 'ANY', label: '不限' }
    ]);
    FSCore.SORT_MODES = Object.freeze([
        { value: 'RELEVANCE', label: '相关度' },
        { value: 'LATEST', label: '近期' },
        { value: 'VIEW_COUNT', label: '热门' }
    ]);
    FSCore.DEFAULT_FEATURE_FLAGS = Object.freeze({
        API_ENHANCED_SEARCH: false,
        DERIVED_METRICS: false,
        AI_TOPIC_TAGGING: false,
        HISTORICAL_TRACKING: false,
        CREATOR_RANKINGS: false,
        ALERTS: false
    });
    function createDefaultDiscoverySettings() {
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
    FSCore.createDefaultDiscoverySettings = createDefaultDiscoverySettings;
    function createDefaultSettings() {
        return {
            schemaVersion: FSCore.SCHEMA_VERSION,
            enabled: true,
            gate: 'LEVEL_A',
            flags: { ...FSCore.DEFAULT_FEATURE_FLAGS },
            discovery: createDefaultDiscoverySettings()
        };
    }
    FSCore.createDefaultSettings = createDefaultSettings;
    function includesValue(items, key, value) {
        return typeof value === 'string' && items.some((item) => item[key] === value);
    }
    function normalizeDiscoverySettings(input) {
        const defaults = createDefaultDiscoverySettings();
        if (!input || typeof input !== 'object')
            return defaults;
        const candidate = input;
        const customTopic = typeof candidate.customTopic === 'string'
            ? candidate.customTopic.trim().slice(0, 80)
            : '';
        return {
            active: candidate.active === true,
            topic: includesValue(FSCore.TOPICS, 'id', candidate.topic) ? candidate.topic : defaults.topic,
            customTopic,
            language: candidate.language === 'zh'
                ? 'zh-Hans'
                : includesValue(FSCore.LANGUAGES, 'code', candidate.language) ? candidate.language : defaults.language,
            region: includesValue(FSCore.REGIONS, 'code', candidate.region) ? candidate.region : defaults.region,
            timeRange: includesValue(FSCore.TIME_RANGES, 'value', candidate.timeRange) ? candidate.timeRange : defaults.timeRange,
            sort: includesValue(FSCore.SORT_MODES, 'value', candidate.sort) ? candidate.sort : defaults.sort
        };
    }
    FSCore.normalizeDiscoverySettings = normalizeDiscoverySettings;
    function normalizeSettings(input) {
        const defaults = createDefaultSettings();
        if (!input || typeof input !== 'object')
            return defaults;
        const candidate = input;
        const gate = candidate.gate === 'LEVEL_B' || candidate.gate === 'LEVEL_C'
            ? candidate.gate
            : 'LEVEL_A';
        const rawFlags = candidate.flags && typeof candidate.flags === 'object'
            ? candidate.flags
            : {};
        const flags = { ...FSCore.DEFAULT_FEATURE_FLAGS };
        Object.keys(flags).forEach((key) => {
            flags[key] = rawFlags[key] === true;
        });
        return {
            schemaVersion: FSCore.SCHEMA_VERSION,
            enabled: candidate.enabled !== false,
            gate,
            flags,
            discovery: normalizeDiscoverySettings(candidate.discovery)
        };
    }
    FSCore.normalizeSettings = normalizeSettings;
    function isApplySettingsMessage(input) {
        if (!input || typeof input !== 'object')
            return false;
        const candidate = input;
        return candidate.type === FSCore.MESSAGE_APPLY_SETTINGS && !!candidate.settings;
    }
    FSCore.isApplySettingsMessage = isApplySettingsMessage;
    function topicLabel(discovery) {
        if (discovery.topic === 'custom')
            return discovery.customTopic || '自定义';
        return FSCore.TOPICS.find((item) => item.id === discovery.topic)?.label || '历史';
    }
    FSCore.topicLabel = topicLabel;
    function optionLabel(items, key, value) {
        return items.find((item) => item[key] === value)?.label || value;
    }
    FSCore.optionLabel = optionLabel;
    function discoverySummary(discovery) {
        const parts = [
            topicLabel(discovery),
            optionLabel(FSCore.LANGUAGES, 'code', discovery.language),
            optionLabel(FSCore.REGIONS, 'code', discovery.region),
            optionLabel(FSCore.TIME_RANGES, 'value', discovery.timeRange),
            optionLabel(FSCore.SORT_MODES, 'value', discovery.sort)
        ];
        return parts.join(' · ');
    }
    FSCore.discoverySummary = discoverySummary;
    const TOPIC_QUERY_TERMS = Object.freeze({
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
    const FRESH_WINDOW_FALLBACK = '30D';
    const YOUTUBE_POPULARITY_SP = 'CAMSAhAB';
    function isoDateDaysAgo(now, daysAgo) {
        const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        date.setUTCDate(date.getUTCDate() - daysAgo);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    function queryTerm(discovery) {
        if (discovery.topic === 'custom')
            return discovery.customTopic.trim();
        return TOPIC_QUERY_TERMS[discovery.topic][discovery.language] || TOPIC_QUERY_TERMS[discovery.topic].any;
    }
    FSCore.queryTerm = queryTerm;
    function effectiveTimeRange(discovery) {
        if (discovery.sort === 'LATEST' && discovery.timeRange === 'ANY')
            return FRESH_WINDOW_FALLBACK;
        return discovery.timeRange;
    }
    FSCore.effectiveTimeRange = effectiveTimeRange;
    function afterDateForRange(range, now = new Date()) {
        if (range === '24H')
            return isoDateDaysAgo(now, 1);
        if (range === '7D')
            return isoDateDaysAgo(now, 7);
        if (range === '30D')
            return isoDateDaysAgo(now, 30);
        return null;
    }
    FSCore.afterDateForRange = afterDateForRange;
    function buildQueryPlan(discoveryInput, now = new Date()) {
        const discovery = normalizeDiscoverySettings(discoveryInput);
        const term = queryTerm(discovery) || topicLabel(discovery);
        const range = effectiveTimeRange(discovery);
        const afterDate = afterDateForRange(range, now);
        const queryText = afterDate ? `${term} after:${afterDate}` : term;
        const params = new URLSearchParams();
        params.set('search_query', queryText);
        if (discovery.region !== 'GLOBAL')
            params.set('gl', discovery.region);
        if (discovery.sort === 'VIEW_COUNT')
            params.set('sp', YOUTUBE_POPULARITY_SP);
        const mode = discovery.sort === 'VIEW_COUNT'
            ? 'NATIVE_POPULARITY'
            : discovery.sort === 'LATEST'
                ? 'FRESH_WINDOW'
                : 'NATIVE_RELEVANCE';
        const notes = [];
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
    FSCore.buildQueryPlan = buildQueryPlan;
    function queryModeLabel(mode) {
        if (mode === 'NATIVE_POPULARITY')
            return 'YouTube 热门';
        if (mode === 'FRESH_WINDOW')
            return '近期内容时间窗';
        return 'YouTube 相关度';
    }
    FSCore.queryModeLabel = queryModeLabel;
    function safeTimestamp(input, fallback) {
        if (typeof input !== 'string' || input.length > 40)
            return fallback;
        const date = new Date(input);
        return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
    }
    function safeProfileName(input, discovery) {
        if (typeof input === 'string') {
            const trimmed = input.trim().replace(/\s+/g, ' ').slice(0, 40);
            if (trimmed)
                return trimmed;
        }
        return suggestedProfileName(discovery);
    }
    function safeProfileId(input, fallback) {
        if (typeof input !== 'string')
            return fallback;
        const cleaned = input.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
        return cleaned || fallback;
    }
    function createDefaultProfileStore() {
        return { schemaVersion: FSCore.PROFILE_STORE_SCHEMA_VERSION, favorites: [], recent: [] };
    }
    FSCore.createDefaultProfileStore = createDefaultProfileStore;
    function discoveryFingerprint(discoveryInput) {
        const d = normalizeDiscoverySettings(discoveryInput);
        return [d.topic, d.customTopic.toLocaleLowerCase(), d.language, d.region, d.timeRange, d.sort].join('|');
    }
    FSCore.discoveryFingerprint = discoveryFingerprint;
    function suggestedProfileName(discoveryInput) {
        const d = normalizeDiscoverySettings(discoveryInput);
        const parts = [
            topicLabel(d),
            optionLabel(FSCore.LANGUAGES, 'code', d.language),
            optionLabel(FSCore.REGIONS, 'code', d.region)
        ];
        return parts.join(' · ').slice(0, 40);
    }
    FSCore.suggestedProfileName = suggestedProfileName;
    function normalizeProfileStore(input, now = new Date()) {
        const defaults = createDefaultProfileStore();
        if (!input || typeof input !== 'object')
            return defaults;
        const candidate = input;
        const nowIso = now.toISOString();
        const seenProfiles = new Set();
        const seenProfileIds = new Set();
        const favorites = [];
        if (Array.isArray(candidate.favorites)) {
            for (let index = 0; index < candidate.favorites.length && favorites.length < FSCore.MAX_FAVORITES; index += 1) {
                const raw = candidate.favorites[index];
                if (!raw || typeof raw !== 'object')
                    continue;
                const item = raw;
                const discovery = normalizeDiscoverySettings(item.discovery);
                const fingerprint = discoveryFingerprint(discovery);
                if (seenProfiles.has(fingerprint))
                    continue;
                seenProfiles.add(fingerprint);
                const fallbackId = `profile-${index + 1}`;
                let id = safeProfileId(item.id, fallbackId);
                if (seenProfileIds.has(id))
                    id = `${fallbackId}-${index + 1}`;
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
        const seenRecent = new Set();
        const recent = [];
        if (Array.isArray(candidate.recent)) {
            for (const raw of candidate.recent) {
                if (recent.length >= FSCore.MAX_RECENTS)
                    break;
                if (!raw || typeof raw !== 'object')
                    continue;
                const item = raw;
                const discovery = normalizeDiscoverySettings(item.discovery);
                const key = discoveryFingerprint(discovery);
                if (seenRecent.has(key))
                    continue;
                seenRecent.add(key);
                recent.push({
                    key,
                    discovery: { ...discovery, active: false },
                    lastUsedAt: safeTimestamp(item.lastUsedAt, nowIso)
                });
            }
        }
        recent.sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt));
        return { schemaVersion: FSCore.PROFILE_STORE_SCHEMA_VERSION, favorites, recent };
    }
    FSCore.normalizeProfileStore = normalizeProfileStore;
    function createProfileId(now = new Date(), entropy = Math.random()) {
        const time = now.getTime().toString(36);
        const salt = Math.floor(Math.max(0, Math.min(0.999999999, entropy)) * 0xFFFFFF).toString(36).padStart(5, '0');
        return `fs-${time}-${salt}`;
    }
    FSCore.createProfileId = createProfileId;
    function addFavoriteProfile(storeInput, discoveryInput, nameInput, now = new Date(), id = createProfileId(now)) {
        const store = normalizeProfileStore(storeInput, now);
        const discovery = { ...normalizeDiscoverySettings(discoveryInput), active: false };
        const fingerprint = discoveryFingerprint(discovery);
        const timestamp = now.toISOString();
        const existing = store.favorites.find((item) => discoveryFingerprint(item.discovery) === fingerprint);
        const profile = existing
            ? { ...existing, name: safeProfileName(nameInput, discovery), discovery, updatedAt: timestamp }
            : { id: safeProfileId(id, createProfileId(now, 0)), name: safeProfileName(nameInput, discovery), discovery, createdAt: timestamp, updatedAt: timestamp };
        const favorites = [profile, ...store.favorites.filter((item) => discoveryFingerprint(item.discovery) !== fingerprint)]
            .slice(0, FSCore.MAX_FAVORITES);
        return { ...store, favorites };
    }
    FSCore.addFavoriteProfile = addFavoriteProfile;
    function removeFavoriteProfile(storeInput, profileId, now = new Date()) {
        const store = normalizeProfileStore(storeInput, now);
        return { ...store, favorites: store.favorites.filter((item) => item.id !== profileId) };
    }
    FSCore.removeFavoriteProfile = removeFavoriteProfile;
    function recordRecentChannel(storeInput, discoveryInput, now = new Date()) {
        const store = normalizeProfileStore(storeInput, now);
        const discovery = { ...normalizeDiscoverySettings(discoveryInput), active: false };
        const key = discoveryFingerprint(discovery);
        const entry = { key, discovery, lastUsedAt: now.toISOString() };
        const recent = [entry, ...store.recent.filter((item) => item.key !== key)].slice(0, FSCore.MAX_RECENTS);
        return { ...store, recent };
    }
    FSCore.recordRecentChannel = recordRecentChannel;
    function buildPortableExport(settingsInput, profileStoreInput, now = new Date()) {
        return {
            format: FSCore.PORTABLE_EXPORT_FORMAT,
            version: 1,
            exportedAt: now.toISOString(),
            settings: normalizeSettings(settingsInput),
            profiles: normalizeProfileStore(profileStoreInput, now)
        };
    }
    FSCore.buildPortableExport = buildPortableExport;
    function parsePortableExport(input, now = new Date()) {
        if (!input || typeof input !== 'object')
            return null;
        const candidate = input;
        if (candidate.format !== FSCore.PORTABLE_EXPORT_FORMAT || candidate.version !== 1)
            return null;
        if (!candidate.settings || typeof candidate.settings !== 'object')
            return null;
        if (!candidate.profiles || typeof candidate.profiles !== 'object')
            return null;
        return buildPortableExport(candidate.settings, candidate.profiles, now);
    }
    FSCore.parsePortableExport = parsePortableExport;
    function isBackendCommandMessage(input) {
        if (!input || typeof input !== 'object')
            return false;
        const candidate = input;
        return candidate.type === FSCore.MESSAGE_BACKEND_COMMAND && typeof candidate.action === 'string';
    }
    FSCore.isBackendCommandMessage = isBackendCommandMessage;
    function normalizeBackendAccount(input) {
        if (!input || typeof input !== 'object')
            return null;
        const candidate = input;
        if (candidate.schemaVersion !== 1)
            return null;
        if (typeof candidate.accountId !== 'string' || !candidate.accountId)
            return null;
        if (typeof candidate.syncKey !== 'string' || !/^fs1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(candidate.syncKey))
            return null;
        const revision = Number.isInteger(candidate.revision) && Number(candidate.revision) >= 0 ? Number(candidate.revision) : 0;
        return {
            schemaVersion: 1,
            accountId: candidate.accountId.slice(0, 100),
            syncKey: candidate.syncKey.slice(0, 240),
            revision,
            connectedAt: typeof candidate.connectedAt === 'string' ? candidate.connectedAt.slice(0, 40) : new Date(0).toISOString(),
            lastSyncAt: typeof candidate.lastSyncAt === 'string' ? candidate.lastSyncAt.slice(0, 40) : null
        };
    }
    FSCore.normalizeBackendAccount = normalizeBackendAccount;
    function createDefaultRemoteConfig(now = new Date()) {
        return {
            schemaVersion: 1,
            gateCeiling: 'LEVEL_A',
            flags: { ...FSCore.DEFAULT_FEATURE_FLAGS },
            message: '',
            updatedAt: now.toISOString(),
            fetchedAt: now.toISOString()
        };
    }
    FSCore.createDefaultRemoteConfig = createDefaultRemoteConfig;
    function normalizePrivacyConsent(input) {
        if (!input || typeof input !== 'object')
            return null;
        const candidate = input;
        if (candidate.schemaVersion !== 1)
            return null;
        if (candidate.policyVersion !== FSCore.PRIVACY_POLICY_VERSION)
            return null;
        if (typeof candidate.cloudSyncAcceptedAt !== 'string' || Number.isNaN(Date.parse(candidate.cloudSyncAcceptedAt)))
            return null;
        return {
            schemaVersion: 1,
            policyVersion: FSCore.PRIVACY_POLICY_VERSION,
            cloudSyncAcceptedAt: candidate.cloudSyncAcceptedAt.slice(0, 40)
        };
    }
    FSCore.normalizePrivacyConsent = normalizePrivacyConsent;
    function createPrivacyConsent(now = new Date()) {
        return {
            schemaVersion: 1,
            policyVersion: FSCore.PRIVACY_POLICY_VERSION,
            cloudSyncAcceptedAt: now.toISOString()
        };
    }
    FSCore.createPrivacyConsent = createPrivacyConsent;
    function hasCurrentPrivacyConsent(input) {
        return normalizePrivacyConsent(input) !== null;
    }
    FSCore.hasCurrentPrivacyConsent = hasCurrentPrivacyConsent;
    function normalizeRemoteConfig(input, now = new Date()) {
        const defaults = createDefaultRemoteConfig(now);
        if (!input || typeof input !== 'object')
            return defaults;
        const candidate = input;
        const rawFlags = candidate.flags && typeof candidate.flags === 'object' ? candidate.flags : {};
        const flags = { ...FSCore.DEFAULT_FEATURE_FLAGS };
        Object.keys(flags).forEach((key) => { flags[key] = rawFlags[key] === true; });
        return {
            schemaVersion: 1,
            gateCeiling: candidate.gateCeiling === 'LEVEL_C' || candidate.gateCeiling === 'LEVEL_B' ? candidate.gateCeiling : 'LEVEL_A',
            flags,
            message: typeof candidate.message === 'string' ? candidate.message.slice(0, 240) : '',
            updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt.slice(0, 40) : defaults.updatedAt,
            fetchedAt: typeof candidate.fetchedAt === 'string' ? candidate.fetchedAt.slice(0, 40) : now.toISOString()
        };
    }
    FSCore.normalizeRemoteConfig = normalizeRemoteConfig;
    function gateRank(gate) {
        return gate === 'LEVEL_C' ? 3 : gate === 'LEVEL_B' ? 2 : 1;
    }
    function effectiveGate(localGate, remoteGate) {
        return gateRank(localGate) <= gateRank(remoteGate) ? localGate : remoteGate;
    }
    FSCore.effectiveGate = effectiveGate;
    function effectiveFeatureFlags(localFlags, remoteFlags) {
        const result = { ...FSCore.DEFAULT_FEATURE_FLAGS };
        Object.keys(result).forEach((key) => {
            result[key] = localFlags[key] === true && remoteFlags[key] === true;
        });
        return result;
    }
    FSCore.effectiveFeatureFlags = effectiveFeatureFlags;
    function buildSyncPayload(settingsInput, profileStoreInput, now = new Date()) {
        const settings = normalizeSettings(settingsInput);
        const discovery = normalizeDiscoverySettings(settings.discovery);
        return {
            schemaVersion: 1,
            discovery: { ...discovery, active: false },
            profiles: normalizeProfileStore(profileStoreInput, now)
        };
    }
    FSCore.buildSyncPayload = buildSyncPayload;
    function applySyncPayload(settingsInput, payloadInput, now = new Date()) {
        if (!payloadInput || typeof payloadInput !== 'object')
            return null;
        const candidate = payloadInput;
        if (candidate.schemaVersion !== 1 || !candidate.discovery || !candidate.profiles)
            return null;
        const current = normalizeSettings(settingsInput);
        return {
            settings: normalizeSettings({ ...current, discovery: { ...normalizeDiscoverySettings(candidate.discovery), active: false } }),
            profiles: normalizeProfileStore(candidate.profiles, now)
        };
    }
    FSCore.applySyncPayload = applySyncPayload;
})(FSCore || (FSCore = {}));
globalThis.FSCore = FSCore;
/// <reference path="../shared/core.ts" />
(() => {
    const ROOT_ID = 'feed-switcher-root';
    const STYLE_ID = 'feed-switcher-style';
    let mountInFlight = false;
    let enabledState = true;
    let currentSettings = FSCore.createDefaultSettings();
    let currentProfileStore = FSCore.createDefaultProfileStore();
    let activeChannel = FSCore.createDefaultDiscoverySettings();
    const styles = `
    #${ROOT_ID}{position:fixed;right:18px;bottom:24px;z-index:2147483647;font-family:Arial,"Microsoft YaHei",sans-serif;color:#f7f7f7}
    #${ROOT_ID} *{box-sizing:border-box}
    .fs-launcher{width:50px;height:50px;border:1px solid rgba(255,255,255,.1);border-radius:17px;background:#111;color:#fff;box-shadow:0 10px 34px rgba(0,0,0,.34);cursor:pointer;font-weight:850;letter-spacing:.5px;transition:transform .14s ease,background .14s ease}
    .fs-launcher:hover{transform:translateY(-1px);background:#191919}
    .fs-panel{position:absolute;right:0;bottom:62px;width:390px;max-height:min(720px,calc(100vh - 110px));overflow:auto;padding:0;border:1px solid rgba(255,255,255,.12);border-radius:22px;background:rgba(18,18,18,.985);box-shadow:0 24px 70px rgba(0,0,0,.48);display:none;color:#f5f5f5}
    .fs-panel[data-open="true"]{display:block}
    .fs-head{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;gap:12px;padding:18px 18px 14px;background:linear-gradient(180deg,#151515 82%,rgba(21,21,21,.92));border-bottom:1px solid #2b2b2b}
    .fs-title{font-size:17px;font-weight:850;letter-spacing:-.2px}
    .fs-sub{margin-top:4px;font-size:11px;color:#9a9a9a;line-height:1.45}
    .fs-state{align-self:flex-start;padding:5px 8px;border-radius:999px;background:#262626;color:#bbb;font-size:10px;font-weight:750;white-space:nowrap}
    .fs-state[data-active="true"]{background:#eef6ee;color:#173d17}
    .fs-body{padding:16px 18px 18px}
    .fs-current{margin-bottom:14px;padding:12px 13px;border:1px solid #353535;border-radius:14px;background:linear-gradient(180deg,#202020,#181818)}
    .fs-current-label{font-size:10px;color:#777;text-transform:uppercase;letter-spacing:.8px}.fs-current-text{margin-top:5px;font-size:12px;line-height:1.5;color:#f0f0f0;font-weight:800}.fs-current-note{margin-top:4px;font-size:9.5px;color:#777}
    .fs-section{margin-top:17px}.fs-section:first-child{margin-top:0}
    .fs-label{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px;font-size:12px;font-weight:800;color:#d7d7d7}
    .fs-hint{font-size:10px;font-weight:500;color:#777}
    .fs-topic-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
    .fs-topic{min-height:54px;padding:7px 5px;border:1px solid #333;border-radius:13px;background:#202020;color:#d8d8d8;cursor:pointer;font-size:11px;font-weight:750;transition:border-color .12s ease,background .12s ease,transform .12s ease}
    .fs-topic:hover{border-color:#555;transform:translateY(-1px)}
    .fs-topic[data-selected="true"]{background:#f1f1f1;border-color:#f1f1f1;color:#111}
    .fs-topic-icon{display:block;margin-bottom:3px;font-size:15px;line-height:1}
    .fs-custom-wrap{display:none;margin-top:8px}.fs-custom-wrap[data-visible="true"]{display:block}
    .fs-input,.fs-select{width:100%;height:38px;border:1px solid #353535;border-radius:11px;background:#202020;color:#eee;padding:0 11px;outline:none;font-size:12px}
    .fs-input:focus,.fs-select:focus{border-color:#777}
    .fs-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .fs-segment{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
    .fs-segment[data-count="3"]{grid-template-columns:repeat(3,1fr)}
    .fs-seg{height:36px;border:1px solid #333;border-radius:10px;background:#202020;color:#aaa;cursor:pointer;font-size:11px;font-weight:700}
    .fs-seg[data-selected="true"]{background:#ebebeb;border-color:#ebebeb;color:#111}
    .fs-summary{margin-top:18px;padding:12px 13px;border:1px solid #303030;border-radius:14px;background:#181818}
    .fs-summary-kicker{font-size:10px;color:#777;text-transform:uppercase;letter-spacing:.8px}
    .fs-summary-text{margin-top:5px;font-size:12px;line-height:1.5;color:#e7e7e7;font-weight:700}
    .fs-summary-note{margin-top:4px;font-size:10px;line-height:1.45;color:#7c7c7c}
    .fs-query{margin-top:10px;padding:10px 11px;border:1px dashed #343434;border-radius:12px;background:#141414}
    .fs-query-line{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
    .fs-query-key{font-size:10px;color:#727272;white-space:nowrap}.fs-query-value{font-size:10px;color:#c8c8c8;text-align:right;line-height:1.45;word-break:break-word}
    .fs-query-note{margin-top:7px;padding-top:7px;border-top:1px solid #242424;font-size:9.5px;line-height:1.45;color:#747474}
    .fs-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
    .fs-primary,.fs-secondary{height:40px;border-radius:12px;font-size:12px;font-weight:800;cursor:pointer}
    .fs-primary{border:1px solid #f3f3f3;background:#f3f3f3;color:#111}.fs-primary:hover{background:#fff}
    .fs-secondary{border:1px solid #383838;background:#202020;color:#c6c6c6}.fs-secondary:hover{border-color:#555}
    .fs-toast{min-height:17px;margin-top:9px;font-size:10px;color:#8d8d8d;text-align:center}
    .fs-profile-tools{display:flex;align-items:center;gap:6px}.fs-import-status{display:none;margin:8px 0 0;padding:8px 10px;border-radius:10px;font-size:10px;line-height:1.45}.fs-import-status[data-visible="true"]{display:block}.fs-import-status[data-kind="success"]{background:#16251a;border:1px solid #284b31;color:#a8dbb3}.fs-import-status[data-kind="error"]{background:#2a1717;border:1px solid #563030;color:#e4a8a8}.fs-import-status[data-kind="info"]{background:#1b1f29;border:1px solid #343b4d;color:#aeb9d6}.fs-mini{height:28px;padding:0 9px;border:1px solid #333;border-radius:9px;background:#1c1c1c;color:#aaa;font-size:10px;font-weight:700;cursor:pointer}.fs-mini:hover{border-color:#555;color:#ddd}
    .fs-profile-save{display:grid;grid-template-columns:1fr auto;gap:7px;margin-top:8px}.fs-profile-save .fs-input{height:34px}.fs-profile-save .fs-mini{height:34px}
    .fs-profile-empty{padding:10px;border:1px dashed #323232;border-radius:11px;color:#6f6f6f;font-size:10px;line-height:1.45}
    .fs-profile-list{display:flex;flex-direction:column;gap:6px}.fs-profile-item{display:grid;grid-template-columns:1fr auto;gap:7px;align-items:center;padding:8px 9px;border:1px solid #303030;border-radius:11px;background:#1a1a1a}.fs-profile-main{min-width:0;border:0;background:transparent;color:#ddd;text-align:left;cursor:pointer;padding:0}.fs-profile-name{display:block;font-size:11px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fs-profile-meta{display:block;margin-top:3px;color:#747474;font-size:9.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fs-profile-remove{width:26px;height:26px;border:0;border-radius:8px;background:#232323;color:#777;cursor:pointer}.fs-profile-remove:hover{background:#302020;color:#d99}
    .fs-recent-list{display:flex;flex-wrap:wrap;gap:6px}.fs-recent{max-width:100%;padding:7px 9px;border:1px solid #303030;border-radius:999px;background:#1b1b1b;color:#aaa;font-size:9.5px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fs-recent:hover{border-color:#555;color:#ddd}
    .fs-divider{height:1px;margin:15px 0;background:#242424}.fs-hidden-file{display:none}
    @media (max-width:520px){#${ROOT_ID}{right:10px;bottom:16px}.fs-panel{width:min(390px,calc(100vw - 20px))}.fs-topic-grid{grid-template-columns:repeat(3,1fr)}}
  `;
    function ensureStyle() {
        if (document.getElementById(STYLE_ID))
            return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = styles;
        (document.head || document.documentElement).appendChild(style);
    }
    async function readSettings() {
        const data = await chrome.storage.local.get(FSCore.STORAGE_KEY);
        return FSCore.normalizeSettings(data[FSCore.STORAGE_KEY]);
    }
    async function saveSettings(settings) {
        currentSettings = FSCore.normalizeSettings(settings);
        await chrome.storage.local.set({ [FSCore.STORAGE_KEY]: currentSettings });
    }
    async function readProfileStore() {
        const data = await chrome.storage.local.get(FSCore.PROFILE_STORE_KEY);
        return FSCore.normalizeProfileStore(data[FSCore.PROFILE_STORE_KEY]);
    }
    async function saveProfileStore(store) {
        currentProfileStore = FSCore.normalizeProfileStore(store);
        await chrome.storage.local.set({ [FSCore.PROFILE_STORE_KEY]: currentProfileStore });
    }
    function unmount() {
        document.getElementById(ROOT_ID)?.remove();
    }
    function selectOptions(items, key, selected) {
        return items.map((item) => {
            const value = String(item[key]);
            const isSelected = value === selected ? ' selected' : '';
            return `<option value="${value}"${isSelected}>${item.label}</option>`;
        }).join('');
    }
    function topicButtons(discovery) {
        return FSCore.TOPICS.map((topic) => `
      <button class="fs-topic" type="button" data-topic="${topic.id}" data-selected="${topic.id === discovery.topic}">
        <span class="fs-topic-icon">${topic.icon}</span>${topic.label}
      </button>
    `).join('');
    }
    function segmentButtons(items, key, selected, attribute) {
        return items.map((item) => {
            const value = String(item[key]);
            return `<button class="fs-seg" type="button" data-${attribute}="${value}" data-selected="${value === selected}">${item.label}</button>`;
        }).join('');
    }
    function favoriteProfilesHtml(store) {
        if (!store.favorites.length) {
            return '<div class="fs-profile-empty">还没有收藏频道。先调好主题、语言、地区和时间，再点“收藏当前”。</div>';
        }
        return `<div class="fs-profile-list">${store.favorites.map((profile) => `
      <div class="fs-profile-item">
        <button class="fs-profile-main" type="button" data-profile-open="${escapeHtml(profile.id)}" title="切换到 ${escapeHtml(profile.name)}">
          <span class="fs-profile-name">${escapeHtml(profile.name)}</span>
          <span class="fs-profile-meta">${escapeHtml(FSCore.discoverySummary(profile.discovery))}</span>
        </button>
        <button class="fs-profile-remove" type="button" data-profile-remove="${escapeHtml(profile.id)}" aria-label="删除收藏">×</button>
      </div>
    `).join('')}</div>`;
    }
    function recentChannelsHtml(store) {
        if (!store.recent.length) {
            return '<div class="fs-profile-empty">还没有最近使用记录。进入频道后会自动记录，最多保留 8 条。</div>';
        }
        return `<div class="fs-recent-list">${store.recent.map((entry) => `
      <button class="fs-recent" type="button" data-recent-key="${escapeHtml(entry.key)}" title="${escapeHtml(FSCore.discoverySummary(entry.discovery))}">${escapeHtml(FSCore.discoverySummary(entry.discovery))}</button>
    `).join('')}</div>`;
    }
    function setToast(root, text) {
        const toast = root.querySelector('[data-toast]');
        if (!toast)
            return;
        toast.textContent = text;
        window.setTimeout(() => {
            if (toast.textContent === text)
                toast.textContent = '';
        }, 2600);
    }
    function setImportStatus(root, text, kind) {
        const status = root.querySelector('[data-import-status]');
        if (!status)
            return;
        status.textContent = text;
        status.dataset.kind = kind;
        status.dataset.visible = 'true';
    }
    function currentChannelText() {
        return activeChannel.active ? FSCore.discoverySummary(activeChannel) : '普通 YouTube';
    }
    function queryPreviewHtml(plan) {
        const notes = plan.notes.length
            ? `<div class="fs-query-note">${plan.notes.map((note) => escapeHtml(note)).join('<br>')}</div>`
            : '';
        return `
      <div class="fs-query-line"><span class="fs-query-key">搜索词</span><span class="fs-query-value">${escapeHtml(plan.queryText)}</span></div>
      <div class="fs-query-line"><span class="fs-query-key">执行模式</span><span class="fs-query-value">${escapeHtml(FSCore.queryModeLabel(plan.mode))}</span></div>
      <div class="fs-query-line"><span class="fs-query-key">地区提示</span><span class="fs-query-value">${escapeHtml(plan.regionHint || 'GLOBAL')}</span></div>
      ${notes}
    `;
    }
    function runQuery(discovery) {
        const plan = FSCore.buildQueryPlan(discovery);
        window.location.assign(plan.url);
    }
    function render(settings) {
        if (!enabledState || !settings.enabled || !document.body || document.getElementById(ROOT_ID))
            return;
        currentSettings = settings;
        ensureStyle();
        const root = document.createElement('div');
        root.id = ROOT_ID;
        const discovery = settings.discovery;
        root.innerHTML = `
      <div class="fs-panel" data-open="false" role="dialog" aria-label="Feed Switcher Local Profiles">
        <div class="fs-head">
          <div>
            <div class="fs-title">Feed Switcher</div>
            <div class="fs-sub">选择今天想进入的信息频道，而不是等待算法重新认识你。</div>
          </div>
          <div class="fs-state" data-mode data-active="${discovery.active}">${discovery.active ? '频道模式' : '普通 YouTube'}</div>
        </div>
        <div class="fs-body">
          <div class="fs-current" data-current-channel>
            <div class="fs-current-label">当前频道</div>
            <div class="fs-current-text" data-current-channel-text>${escapeHtml(currentChannelText())}</div>
            <div class="fs-current-note">这里显示已经实际进入的频道；下方修改参数后，只有点击“进入频道”才会更新。</div>
          </div>

          <section class="fs-section">
            <div class="fs-label">
              <span>我的频道</span>
              <span class="fs-profile-tools">
                <button class="fs-mini" type="button" data-export>导出</button>
                <button class="fs-mini" type="button" data-import>导入</button>
              </span>
            </div>
            <div class="fs-import-status" data-import-status data-visible="false" data-kind="info" role="status" aria-live="polite"></div>
            <div data-favorites>${favoriteProfilesHtml(currentProfileStore)}</div>
            <div class="fs-profile-save">
              <input class="fs-input" data-profile-name data-dirty="false" maxlength="40" value="${escapeHtml(FSCore.suggestedProfileName(discovery))}" aria-label="收藏名称" />
              <button class="fs-mini" type="button" data-profile-save>收藏当前</button>
            </div>
            <input class="fs-hidden-file" data-import-file type="file" accept="application/json,.json" />
          </section>

          <section class="fs-section">
            <div class="fs-label"><span>最近使用</span><span class="fs-hint">最多 8 条</span></div>
            <div data-recents>${recentChannelsHtml(currentProfileStore)}</div>
          </section>

          <div class="fs-divider"></div>

          <section class="fs-section">
            <div class="fs-label"><span>频道主题</span><span class="fs-hint">FS-006 · Level A</span></div>
            <div class="fs-topic-grid">${topicButtons(discovery)}</div>
            <div class="fs-custom-wrap" data-custom-wrap data-visible="${discovery.topic === 'custom'}">
              <input class="fs-input" data-custom-topic maxlength="80" value="${escapeHtml(discovery.customTopic)}" placeholder="例如：冷战时期苏联军事技术" />
            </div>
          </section>

          <section class="fs-section">
            <div class="fs-label"><span>语言偏好与地区</span><span class="fs-hint">语言当前不是硬过滤</span></div>
            <div class="fs-row">
              <select class="fs-select" data-language aria-label="语言">${selectOptions(FSCore.LANGUAGES, 'code', discovery.language)}</select>
              <select class="fs-select" data-region aria-label="地区">${selectOptions(FSCore.REGIONS, 'code', discovery.region)}</select>
            </div>
          </section>

          <section class="fs-section">
            <div class="fs-label"><span>时间范围</span></div>
            <div class="fs-segment">${segmentButtons(FSCore.TIME_RANGES, 'value', discovery.timeRange, 'time')}</div>
          </section>

          <section class="fs-section">
            <div class="fs-label"><span>优先级</span><span class="fs-hint">近期非严格时间倒序</span></div>
            <div class="fs-segment" data-count="3">${segmentButtons(FSCore.SORT_MODES, 'value', discovery.sort, 'sort')}</div>
          </section>

          <div class="fs-summary">
            <div class="fs-summary-kicker">待进入频道</div>
            <div class="fs-summary-text" data-summary>${FSCore.discoverySummary(discovery)}</div>
            <div class="fs-summary-note">Level A 只编排 YouTube 原生搜索，不调用 Data API，不计算衍生指标。</div>
            <div class="fs-query" data-query-preview>${queryPreviewHtml(FSCore.buildQueryPlan(discovery))}</div>
          </div>

          <div class="fs-actions">
            <button class="fs-primary" type="button" data-apply>进入频道</button>
            <button class="fs-secondary" type="button" data-restore>恢复普通 YouTube</button>
          </div>
          <div class="fs-toast" data-toast></div>
        </div>
      </div>
      <button class="fs-launcher" type="button" aria-label="打开 Feed Switcher">FS</button>
    `;
        const button = root.querySelector('.fs-launcher');
        const panel = root.querySelector('.fs-panel');
        button?.addEventListener('click', () => {
            if (!panel)
                return;
            panel.dataset.open = panel.dataset.open === 'true' ? 'false' : 'true';
        });
        bindControls(root);
        document.body.appendChild(root);
    }
    function escapeHtml(value) {
        return value
            .replaceAll('&', '&amp;')
            .replaceAll('"', '&quot;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;');
    }
    function updateView(root, settings) {
        const discovery = settings.discovery;
        root.querySelectorAll('[data-topic]').forEach((node) => {
            node.dataset.selected = node.dataset.topic === discovery.topic ? 'true' : 'false';
        });
        root.querySelectorAll('[data-time]').forEach((node) => {
            node.dataset.selected = node.dataset.time === discovery.timeRange ? 'true' : 'false';
        });
        root.querySelectorAll('[data-sort]').forEach((node) => {
            node.dataset.selected = node.dataset.sort === discovery.sort ? 'true' : 'false';
        });
        const customWrap = root.querySelector('[data-custom-wrap]');
        if (customWrap)
            customWrap.dataset.visible = discovery.topic === 'custom' ? 'true' : 'false';
        const summary = root.querySelector('[data-summary]');
        if (summary)
            summary.textContent = FSCore.discoverySummary(discovery);
        const queryPreview = root.querySelector('[data-query-preview]');
        if (queryPreview)
            queryPreview.innerHTML = queryPreviewHtml(FSCore.buildQueryPlan(discovery));
        const profileName = root.querySelector('[data-profile-name]');
        if (profileName && profileName.dataset.dirty !== 'true') {
            profileName.value = FSCore.suggestedProfileName(discovery);
        }
        const mode = root.querySelector('[data-mode]');
        if (mode) {
            mode.dataset.active = discovery.active ? 'true' : 'false';
            mode.textContent = discovery.active ? '频道模式' : '普通 YouTube';
        }
    }
    async function applyChannel(discoveryInput) {
        const discovery = { ...FSCore.normalizeDiscoverySettings(discoveryInput), active: true };
        const next = FSCore.normalizeSettings({ ...currentSettings, discovery });
        const store = FSCore.recordRecentChannel(currentProfileStore, discovery);
        await chrome.storage.local.set({
            [FSCore.STORAGE_KEY]: next,
            [FSCore.PROFILE_STORE_KEY]: store
        });
        currentSettings = next;
        currentProfileStore = store;
        activeChannel = discovery;
        runQuery(discovery);
    }
    function exportLocalData() {
        const bundle = FSCore.buildPortableExport(currentSettings, currentProfileStore);
        const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
        const href = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = href;
        anchor.download = `feed-switcher-backup-${new Date().toISOString().slice(0, 10)}.json`;
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(href), 1500);
    }
    async function importLocalData(file, root) {
        setImportStatus(root, `正在检查：${file.name}`, 'info');
        try {
            const text = await file.text();
            let raw;
            try {
                raw = JSON.parse(text);
            }
            catch {
                setImportStatus(root, '导入失败：这不是有效的 JSON 文件。', 'error');
                return;
            }
            const parsed = FSCore.parsePortableExport(raw);
            if (!parsed) {
                setImportStatus(root, '导入失败：不是 Feed Switcher 备份，或备份版本不受支持。', 'error');
                return;
            }
            await chrome.storage.local.set({
                [FSCore.STORAGE_KEY]: parsed.settings,
                [FSCore.PROFILE_STORE_KEY]: parsed.profiles
            });
            currentSettings = parsed.settings;
            currentProfileStore = parsed.profiles;
            activeChannel = parsed.settings.discovery;
            rerender(true);
            const nextRoot = document.getElementById(ROOT_ID);
            if (nextRoot) {
                setImportStatus(nextRoot, `导入成功：已恢复 ${parsed.profiles.favorites.length} 个收藏、${parsed.profiles.recent.length} 条最近使用。`, 'success');
            }
        }
        catch {
            setImportStatus(root, '导入失败：读取或保存备份时发生异常。', 'error');
        }
    }
    function rerender(open = true) {
        unmount();
        if (!enabledState || !currentSettings.enabled)
            return;
        render(currentSettings);
        if (open) {
            const panel = document.querySelector(`#${ROOT_ID} .fs-panel`);
            if (panel)
                panel.dataset.open = 'true';
        }
    }
    function collectSettings(root) {
        const language = root.querySelector('[data-language]')?.value;
        const region = root.querySelector('[data-region]')?.value;
        const customTopic = root.querySelector('[data-custom-topic]')?.value ?? currentSettings.discovery.customTopic;
        return FSCore.normalizeSettings({
            ...currentSettings,
            discovery: {
                ...currentSettings.discovery,
                language,
                region,
                customTopic
            }
        });
    }
    function bindControls(root) {
        root.querySelectorAll('[data-topic]').forEach((button) => {
            button.addEventListener('click', () => {
                currentSettings = FSCore.normalizeSettings({
                    ...collectSettings(root),
                    discovery: { ...collectSettings(root).discovery, topic: button.dataset.topic }
                });
                updateView(root, currentSettings);
            });
        });
        root.querySelectorAll('[data-time]').forEach((button) => {
            button.addEventListener('click', () => {
                const base = collectSettings(root);
                currentSettings = FSCore.normalizeSettings({
                    ...base,
                    discovery: { ...base.discovery, timeRange: button.dataset.time }
                });
                updateView(root, currentSettings);
            });
        });
        root.querySelectorAll('[data-sort]').forEach((button) => {
            button.addEventListener('click', () => {
                const base = collectSettings(root);
                currentSettings = FSCore.normalizeSettings({
                    ...base,
                    discovery: { ...base.discovery, sort: button.dataset.sort }
                });
                updateView(root, currentSettings);
            });
        });
        const language = root.querySelector('[data-language]');
        const region = root.querySelector('[data-region]');
        const custom = root.querySelector('[data-custom-topic]');
        for (const node of [language, region]) {
            node?.addEventListener('change', () => {
                currentSettings = collectSettings(root);
                updateView(root, currentSettings);
            });
        }
        custom?.addEventListener('input', () => {
            currentSettings = collectSettings(root);
            updateView(root, currentSettings);
        });
        const profileNameInput = root.querySelector('[data-profile-name]');
        profileNameInput?.addEventListener('input', () => {
            profileNameInput.dataset.dirty = 'true';
        });
        root.querySelector('[data-apply]')?.addEventListener('click', async () => {
            const base = collectSettings(root);
            if (base.discovery.topic === 'custom' && !base.discovery.customTopic) {
                setToast(root, '请输入自定义 Topic 后再保存。');
                custom?.focus();
                return;
            }
            await applyChannel(base.discovery);
        });
        root.querySelector('[data-profile-save]')?.addEventListener('click', async () => {
            const base = collectSettings(root);
            if (base.discovery.topic === 'custom' && !base.discovery.customTopic) {
                setToast(root, '请输入自定义 Topic 后再收藏。');
                custom?.focus();
                return;
            }
            const name = root.querySelector('[data-profile-name]')?.value || FSCore.suggestedProfileName(base.discovery);
            const store = FSCore.addFavoriteProfile(currentProfileStore, base.discovery, name);
            await saveProfileStore(store);
            currentSettings = base;
            rerender(true);
        });
        root.querySelectorAll('[data-profile-open]').forEach((button) => {
            button.addEventListener('click', async () => {
                const profile = currentProfileStore.favorites.find((item) => item.id === button.dataset.profileOpen);
                if (profile)
                    await applyChannel(profile.discovery);
            });
        });
        root.querySelectorAll('[data-profile-remove]').forEach((button) => {
            button.addEventListener('click', async () => {
                const id = button.dataset.profileRemove;
                if (!id)
                    return;
                await saveProfileStore(FSCore.removeFavoriteProfile(currentProfileStore, id));
                rerender(true);
            });
        });
        root.querySelectorAll('[data-recent-key]').forEach((button) => {
            button.addEventListener('click', async () => {
                const entry = currentProfileStore.recent.find((item) => item.key === button.dataset.recentKey);
                if (entry)
                    await applyChannel(entry.discovery);
            });
        });
        root.querySelector('[data-export]')?.addEventListener('click', () => {
            exportLocalData();
            setImportStatus(root, '导出成功：本地配置备份已下载。', 'success');
        });
        const importFile = root.querySelector('[data-import-file]');
        root.querySelector('[data-import]')?.addEventListener('click', () => importFile?.click());
        importFile?.addEventListener('change', async () => {
            const file = importFile.files?.[0];
            if (file)
                await importLocalData(file, root);
            importFile.value = '';
        });
        root.querySelector('[data-restore]')?.addEventListener('click', async () => {
            const base = collectSettings(root);
            const next = FSCore.normalizeSettings({
                ...base,
                discovery: { ...base.discovery, active: false }
            });
            await saveSettings(next);
            activeChannel = next.discovery;
            updateView(root, next);
            const currentText = root.querySelector('[data-current-channel-text]');
            if (currentText)
                currentText.textContent = currentChannelText();
            window.location.assign('https://www.youtube.com/');
        });
    }
    function applySettings(settingsInput) {
        const settings = FSCore.normalizeSettings(settingsInput);
        enabledState = settings.enabled;
        currentSettings = settings;
        activeChannel = settings.discovery;
        if (!enabledState) {
            unmount();
            return settings;
        }
        const wasOpen = document.querySelector(`#${ROOT_ID} .fs-panel`)?.dataset.open === 'true';
        unmount();
        render(settings);
        if (wasOpen) {
            const panel = document.querySelector(`#${ROOT_ID} .fs-panel`);
            if (panel)
                panel.dataset.open = 'true';
        }
        return settings;
    }
    async function syncUi() {
        if (mountInFlight)
            return;
        mountInFlight = true;
        try {
            const [settings, profiles] = await Promise.all([readSettings(), readProfileStore()]);
            currentProfileStore = profiles;
            applySettings(settings);
        }
        finally {
            mountInFlight = false;
        }
    }
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (FSCore.isApplySettingsMessage(message)) {
            const settings = applySettings(message.settings);
            sendResponse({ ok: true, enabled: settings.enabled, version: 'FS-006' });
            return;
        }
        if (message && typeof message === 'object' && message.type === FSCore.MESSAGE_PING) {
            sendResponse({ ok: true, enabled: enabledState, version: 'FS-006' });
        }
    });
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local')
            return;
        if (changes[FSCore.PROFILE_STORE_KEY]) {
            currentProfileStore = FSCore.normalizeProfileStore(changes[FSCore.PROFILE_STORE_KEY].newValue);
        }
        if (changes[FSCore.STORAGE_KEY]) {
            applySettings(changes[FSCore.STORAGE_KEY].newValue);
            return;
        }
        if (changes[FSCore.PROFILE_STORE_KEY] && enabledState && document.getElementById(ROOT_ID)) {
            const wasOpen = document.querySelector(`#${ROOT_ID} .fs-panel`)?.dataset.open === 'true';
            rerender(wasOpen);
        }
    });
    const observer = new MutationObserver(() => {
        if (!enabledState)
            return;
        if (!document.getElementById(ROOT_ID))
            void syncUi();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    void syncUi();
})();
