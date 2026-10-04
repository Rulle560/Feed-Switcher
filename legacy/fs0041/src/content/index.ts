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

  function ensureStyle(): void {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = styles;
    (document.head || document.documentElement).appendChild(style);
  }

  async function readSettings(): Promise<FSCore.Settings> {
    const data = await chrome.storage.local.get(FSCore.STORAGE_KEY);
    return FSCore.normalizeSettings(data[FSCore.STORAGE_KEY]);
  }

  async function saveSettings(settings: FSCore.Settings): Promise<void> {
    currentSettings = FSCore.normalizeSettings(settings);
    await chrome.storage.local.set({ [FSCore.STORAGE_KEY]: currentSettings });
  }

  async function readProfileStore(): Promise<FSCore.ProfileStore> {
    const data = await chrome.storage.local.get(FSCore.PROFILE_STORE_KEY);
    return FSCore.normalizeProfileStore(data[FSCore.PROFILE_STORE_KEY]);
  }

  async function saveProfileStore(store: FSCore.ProfileStore): Promise<void> {
    currentProfileStore = FSCore.normalizeProfileStore(store);
    await chrome.storage.local.set({ [FSCore.PROFILE_STORE_KEY]: currentProfileStore });
  }

  function unmount(): void {
    document.getElementById(ROOT_ID)?.remove();
  }

  function selectOptions<T extends string>(items: ReadonlyArray<{ label: string } & Record<string, unknown>>, key: string, selected: T): string {
    return items.map((item) => {
      const value = String(item[key]);
      const isSelected = value === selected ? ' selected' : '';
      return `<option value="${value}"${isSelected}>${item.label}</option>`;
    }).join('');
  }

  function topicButtons(discovery: FSCore.DiscoverySettings): string {
    return FSCore.TOPICS.map((topic) => `
      <button class="fs-topic" type="button" data-topic="${topic.id}" data-selected="${topic.id === discovery.topic}">
        <span class="fs-topic-icon">${topic.icon}</span>${topic.label}
      </button>
    `).join('');
  }

  function segmentButtons<T extends string>(items: ReadonlyArray<{ label: string } & Record<string, unknown>>, key: string, selected: T, attribute: string): string {
    return items.map((item) => {
      const value = String(item[key]);
      return `<button class="fs-seg" type="button" data-${attribute}="${value}" data-selected="${value === selected}">${item.label}</button>`;
    }).join('');
  }

  function favoriteProfilesHtml(store: FSCore.ProfileStore): string {
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

  function recentChannelsHtml(store: FSCore.ProfileStore): string {
    if (!store.recent.length) {
      return '<div class="fs-profile-empty">还没有最近使用记录。进入频道后会自动记录，最多保留 8 条。</div>';
    }
    return `<div class="fs-recent-list">${store.recent.map((entry) => `
      <button class="fs-recent" type="button" data-recent-key="${escapeHtml(entry.key)}" title="${escapeHtml(FSCore.discoverySummary(entry.discovery))}">${escapeHtml(FSCore.discoverySummary(entry.discovery))}</button>
    `).join('')}</div>`;
  }

  function setToast(root: HTMLElement, text: string): void {
    const toast = root.querySelector<HTMLElement>('[data-toast]');
    if (!toast) return;
    toast.textContent = text;
    window.setTimeout(() => {
      if (toast.textContent === text) toast.textContent = '';
    }, 2600);
  }

  function setImportStatus(root: HTMLElement, text: string, kind: 'success' | 'error' | 'info'): void {
    const status = root.querySelector<HTMLElement>('[data-import-status]');
    if (!status) return;
    status.textContent = text;
    status.dataset.kind = kind;
    status.dataset.visible = 'true';
  }

  function currentChannelText(): string {
    return activeChannel.active ? FSCore.discoverySummary(activeChannel) : '普通 YouTube';
  }

  function queryPreviewHtml(plan: FSCore.QueryPlan): string {
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

  function runQuery(discovery: FSCore.DiscoverySettings): void {
    const plan = FSCore.buildQueryPlan(discovery);
    window.location.assign(plan.url);
  }

  function render(settings: FSCore.Settings): void {
    if (!enabledState || !settings.enabled || !document.body || document.getElementById(ROOT_ID)) return;

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
            <div class="fs-label"><span>频道主题</span><span class="fs-hint">FS-004 · Level A</span></div>
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

    const button = root.querySelector<HTMLButtonElement>('.fs-launcher');
    const panel = root.querySelector<HTMLElement>('.fs-panel');
    button?.addEventListener('click', () => {
      if (!panel) return;
      panel.dataset.open = panel.dataset.open === 'true' ? 'false' : 'true';
    });

    bindControls(root);
    document.body.appendChild(root);
  }

  function escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  function updateView(root: HTMLElement, settings: FSCore.Settings): void {
    const discovery = settings.discovery;
    root.querySelectorAll<HTMLElement>('[data-topic]').forEach((node) => {
      node.dataset.selected = node.dataset.topic === discovery.topic ? 'true' : 'false';
    });
    root.querySelectorAll<HTMLElement>('[data-time]').forEach((node) => {
      node.dataset.selected = node.dataset.time === discovery.timeRange ? 'true' : 'false';
    });
    root.querySelectorAll<HTMLElement>('[data-sort]').forEach((node) => {
      node.dataset.selected = node.dataset.sort === discovery.sort ? 'true' : 'false';
    });

    const customWrap = root.querySelector<HTMLElement>('[data-custom-wrap]');
    if (customWrap) customWrap.dataset.visible = discovery.topic === 'custom' ? 'true' : 'false';

    const summary = root.querySelector<HTMLElement>('[data-summary]');
    if (summary) summary.textContent = FSCore.discoverySummary(discovery);

    const queryPreview = root.querySelector<HTMLElement>('[data-query-preview]');
    if (queryPreview) queryPreview.innerHTML = queryPreviewHtml(FSCore.buildQueryPlan(discovery));

    const profileName = root.querySelector<HTMLInputElement>('[data-profile-name]');
    if (profileName && profileName.dataset.dirty !== 'true') {
      profileName.value = FSCore.suggestedProfileName(discovery);
    }

    const mode = root.querySelector<HTMLElement>('[data-mode]');
    if (mode) {
      mode.dataset.active = discovery.active ? 'true' : 'false';
      mode.textContent = discovery.active ? '频道模式' : '普通 YouTube';
    }
  }

  async function applyChannel(discoveryInput: unknown): Promise<void> {
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

  function exportLocalData(): void {
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

  async function importLocalData(file: File, root: HTMLElement): Promise<void> {
    setImportStatus(root, `正在检查：${file.name}`, 'info');
    try {
      const text = await file.text();
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
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
        setImportStatus(
          nextRoot,
          `导入成功：已恢复 ${parsed.profiles.favorites.length} 个收藏、${parsed.profiles.recent.length} 条最近使用。`,
          'success'
        );
      }
    } catch {
      setImportStatus(root, '导入失败：读取或保存备份时发生异常。', 'error');
    }
  }

  function rerender(open = true): void {
    unmount();
    if (!enabledState || !currentSettings.enabled) return;
    render(currentSettings);
    if (open) {
      const panel = document.querySelector<HTMLElement>(`#${ROOT_ID} .fs-panel`);
      if (panel) panel.dataset.open = 'true';
    }
  }

  function collectSettings(root: HTMLElement): FSCore.Settings {
    const language = root.querySelector<HTMLSelectElement>('[data-language]')?.value;
    const region = root.querySelector<HTMLSelectElement>('[data-region]')?.value;
    const customTopic = root.querySelector<HTMLInputElement>('[data-custom-topic]')?.value ?? currentSettings.discovery.customTopic;

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

  function bindControls(root: HTMLElement): void {
    root.querySelectorAll<HTMLButtonElement>('[data-topic]').forEach((button) => {
      button.addEventListener('click', () => {
        currentSettings = FSCore.normalizeSettings({
          ...collectSettings(root),
          discovery: { ...collectSettings(root).discovery, topic: button.dataset.topic }
        });
        updateView(root, currentSettings);
      });
    });

    root.querySelectorAll<HTMLButtonElement>('[data-time]').forEach((button) => {
      button.addEventListener('click', () => {
        const base = collectSettings(root);
        currentSettings = FSCore.normalizeSettings({
          ...base,
          discovery: { ...base.discovery, timeRange: button.dataset.time }
        });
        updateView(root, currentSettings);
      });
    });

    root.querySelectorAll<HTMLButtonElement>('[data-sort]').forEach((button) => {
      button.addEventListener('click', () => {
        const base = collectSettings(root);
        currentSettings = FSCore.normalizeSettings({
          ...base,
          discovery: { ...base.discovery, sort: button.dataset.sort }
        });
        updateView(root, currentSettings);
      });
    });

    const language = root.querySelector<HTMLSelectElement>('[data-language]');
    const region = root.querySelector<HTMLSelectElement>('[data-region]');
    const custom = root.querySelector<HTMLInputElement>('[data-custom-topic]');

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

    const profileNameInput = root.querySelector<HTMLInputElement>('[data-profile-name]');
    profileNameInput?.addEventListener('input', () => {
      profileNameInput.dataset.dirty = 'true';
    });

    root.querySelector<HTMLButtonElement>('[data-apply]')?.addEventListener('click', async () => {
      const base = collectSettings(root);
      if (base.discovery.topic === 'custom' && !base.discovery.customTopic) {
        setToast(root, '请输入自定义 Topic 后再保存。');
        custom?.focus();
        return;
      }

      await applyChannel(base.discovery);
    });

    root.querySelector<HTMLButtonElement>('[data-profile-save]')?.addEventListener('click', async () => {
      const base = collectSettings(root);
      if (base.discovery.topic === 'custom' && !base.discovery.customTopic) {
        setToast(root, '请输入自定义 Topic 后再收藏。');
        custom?.focus();
        return;
      }
      const name = root.querySelector<HTMLInputElement>('[data-profile-name]')?.value || FSCore.suggestedProfileName(base.discovery);
      const store = FSCore.addFavoriteProfile(currentProfileStore, base.discovery, name);
      await saveProfileStore(store);
      currentSettings = base;
      rerender(true);
    });

    root.querySelectorAll<HTMLButtonElement>('[data-profile-open]').forEach((button) => {
      button.addEventListener('click', async () => {
        const profile = currentProfileStore.favorites.find((item) => item.id === button.dataset.profileOpen);
        if (profile) await applyChannel(profile.discovery);
      });
    });

    root.querySelectorAll<HTMLButtonElement>('[data-profile-remove]').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.dataset.profileRemove;
        if (!id) return;
        await saveProfileStore(FSCore.removeFavoriteProfile(currentProfileStore, id));
        rerender(true);
      });
    });

    root.querySelectorAll<HTMLButtonElement>('[data-recent-key]').forEach((button) => {
      button.addEventListener('click', async () => {
        const entry = currentProfileStore.recent.find((item) => item.key === button.dataset.recentKey);
        if (entry) await applyChannel(entry.discovery);
      });
    });

    root.querySelector<HTMLButtonElement>('[data-export]')?.addEventListener('click', () => {
      exportLocalData();
      setImportStatus(root, '导出成功：本地配置备份已下载。', 'success');
    });

    const importFile = root.querySelector<HTMLInputElement>('[data-import-file]');
    root.querySelector<HTMLButtonElement>('[data-import]')?.addEventListener('click', () => importFile?.click());
    importFile?.addEventListener('change', async () => {
      const file = importFile.files?.[0];
      if (file) await importLocalData(file, root);
      importFile.value = '';
    });

    root.querySelector<HTMLButtonElement>('[data-restore]')?.addEventListener('click', async () => {
      const base = collectSettings(root);
      const next = FSCore.normalizeSettings({
        ...base,
        discovery: { ...base.discovery, active: false }
      });
      await saveSettings(next);
      activeChannel = next.discovery;
      updateView(root, next);
      const currentText = root.querySelector<HTMLElement>('[data-current-channel-text]');
      if (currentText) currentText.textContent = currentChannelText();
      window.location.assign('https://www.youtube.com/');
    });
  }

  function applySettings(settingsInput: unknown): FSCore.Settings {
    const settings = FSCore.normalizeSettings(settingsInput);
    enabledState = settings.enabled;
    currentSettings = settings;
    activeChannel = settings.discovery;

    if (!enabledState) {
      unmount();
      return settings;
    }

    const wasOpen = document.querySelector<HTMLElement>(`#${ROOT_ID} .fs-panel`)?.dataset.open === 'true';
    unmount();
    render(settings);
    if (wasOpen) {
      const panel = document.querySelector<HTMLElement>(`#${ROOT_ID} .fs-panel`);
      if (panel) panel.dataset.open = 'true';
    }
    return settings;
  }

  async function syncUi(): Promise<void> {
    if (mountInFlight) return;
    mountInFlight = true;
    try {
      const [settings, profiles] = await Promise.all([readSettings(), readProfileStore()]);
      currentProfileStore = profiles;
      applySettings(settings);
    } finally {
      mountInFlight = false;
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (FSCore.isApplySettingsMessage(message)) {
      const settings = applySettings(message.settings);
      sendResponse({ ok: true, enabled: settings.enabled, version: 'FS-004.1' });
      return;
    }

    if (message && typeof message === 'object' && (message as { type?: string }).type === FSCore.MESSAGE_PING) {
      sendResponse({ ok: true, enabled: enabledState, version: 'FS-004.1' });
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    if (changes[FSCore.PROFILE_STORE_KEY]) {
      currentProfileStore = FSCore.normalizeProfileStore(changes[FSCore.PROFILE_STORE_KEY].newValue);
    }
    if (changes[FSCore.STORAGE_KEY]) {
      applySettings(changes[FSCore.STORAGE_KEY].newValue);
      return;
    }
    if (changes[FSCore.PROFILE_STORE_KEY] && enabledState && document.getElementById(ROOT_ID)) {
      const wasOpen = document.querySelector<HTMLElement>(`#${ROOT_ID} .fs-panel`)?.dataset.open === 'true';
      rerender(wasOpen);
    }
  });

  const observer = new MutationObserver(() => {
    if (!enabledState) return;
    if (!document.getElementById(ROOT_ID)) void syncUi();
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  void syncUi();
})();
