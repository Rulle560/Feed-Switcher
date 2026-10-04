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
    FSCore.CLIENT_VERSION = '0.6.3';
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
