const DEFAULT_CONFIG = {
  apiBase: 'https://ddys.io/api/v1',
  siteBase: 'https://ddys.io',
  apiKey: '',
  homeLimit: 24,
  pageSize: 24,
  timeoutMs: 12000,
  playMode: 'direct-first',
  categories: [
    { type_id: 'latest', type_name: '最新更新' },
    { type_id: 'hot', type_name: '热门内容' },
    { type_id: 'movie', type_name: '电影' },
    { type_id: 'series', type_name: '剧集' },
    { type_id: 'anime', type_name: '动漫' },
    { type_id: 'variety', type_name: '综艺' },
    { type_id: 'documentary', type_name: '纪录片' }
  ],
  filters: {}
};

const state = {
  config: { ...DEFAULT_CONFIG },
  transport: null,
  lastError: ''
};

function init(context, extend) {
  const input = extend === undefined ? context : extend;
  state.config = normalizeConfig(parseExtend(input));
  return '{}';
}

function home(filter) {
  const config = state.config;
  const out = {
    class: config.categories.map((item) => ({
      type_id: String(item.type_id || item.id || ''),
      type_name: String(item.type_name || item.name || '')
    })).filter((item) => item.type_id && item.type_name)
  };
  if (filter) out.filters = config.filters || {};
  return stringify(out);
}

function homeVod() {
  try {
    const items = unwrapData(apiGet('/latest', { limit: state.config.homeLimit }));
    return stringify({ list: toVodList(items) });
  } catch (error) {
    state.lastError = error.message || String(error);
    return stringify({ list: [] });
  }
}

function category(tid, pg, filter, extend) {
  const page = clampPage(pg);
  const pageSize = clampNumber(state.config.pageSize, 24, 1, 80);
  const id = String(tid || 'latest');
  const query = normalizeExtend(extend);
  try {
    if (id === 'latest') {
      const list = unwrapData(apiGet('/latest', { limit: pageSize }));
      return stringify(pagedResult(list, page, 1, list.length));
    }
    if (id === 'hot') {
      const list = unwrapData(apiGet('/hot', { limit: pageSize }));
      return stringify(pagedResult(list, page, 1, list.length));
    }
    const result = unwrapPaged(apiGet('/movies', {
      type: id,
      page,
      per_page: pageSize,
      sort: query.sort || undefined,
      genre: query.genre || undefined,
      region: query.region || undefined,
      year: query.year || undefined
    }));
    return stringify(pagedResult(result.data, page, result.meta.total_pages, result.meta.total));
  } catch (error) {
    state.lastError = error.message || String(error);
    return stringify(pagedResult([], page, 1, 0));
  }
}

function detail(ids) {
  const slug = normalizeId(ids);
  if (!slug) return stringify({ list: [] });
  try {
    const detailEnvelope = apiGet(`/movies/${encodeURIComponent(slug)}`);
    const movie = normalizeMovie(unwrapData(detailEnvelope));
    const sources = safeApi(`/movies/${encodeURIComponent(slug)}/sources`, {});
    const related = safeApi(`/movies/${encodeURIComponent(slug)}/related`, {});
    const vod = toDetailVod(movie, unwrapData(sources), unwrapData(related));
    return stringify({ list: [vod] });
  } catch (error) {
    state.lastError = error.message || String(error);
    return stringify({ list: [] });
  }
}

function search(key, quick, pg) {
  const page = clampPage(pg);
  const q = String(key || '').trim();
  if (!q) return stringify(pagedResult([], page, 1, 0));
  try {
    const result = unwrapPaged(apiGet('/search', {
      q,
      page,
      per_page: state.config.pageSize
    }));
    return stringify(pagedResult(result.data, page, result.meta.total_pages, result.meta.total));
  } catch (error) {
    state.lastError = error.message || String(error);
    return stringify(pagedResult([], page, 1, 0));
  }
}

function play(flag, id) {
  try {
    const payload = decodePlayId(id);
    const url = String(payload.url || id || '').trim();
    if (!url) return stringify({ parse: 0, jx: 0, url: '' });
    const direct = payload.parse === 0 || isDirectMedia(url);
    const result = {
      parse: direct ? 0 : 1,
      jx: direct ? 0 : 1,
      url
    };
    if (payload.header && typeof payload.header === 'object') result.header = payload.header;
    return stringify(result);
  } catch (error) {
    state.lastError = error.message || String(error);
    return stringify({ parse: 0, jx: 0, url: String(id || '') });
  }
}

function homeContent(filter) {
  return home(filter);
}

function homeVideoContent() {
  return homeVod();
}

function categoryContent(tid, pg, filter, extend) {
  return category(tid, pg, filter, extend);
}

function detailContent(ids) {
  return detail(ids);
}

function searchContent(key, quick, pg) {
  return search(key, quick, pg);
}

function playerContent(flag, id, flags) {
  return play(flag, id, flags);
}

function destroy() {
  state.transport = null;
  return '{}';
}

function setTransport(transport) {
  state.transport = typeof transport === 'function' ? transport : null;
}

function getConfig() {
  return { ...state.config };
}

function getLastError() {
  return state.lastError;
}

function parseExtend(input) {
  if (!input) return {};
  if (typeof input === 'object') return input;
  const text = String(input).trim();
  if (!text) return {};
  if (text.startsWith('{') || text.startsWith('[')) return JSON.parse(text);
  if (/^https?:\/\//i.test(text)) {
    const response = requestText(text, { headers: { Accept: 'application/json' }, timeoutMs: DEFAULT_CONFIG.timeoutMs });
    return response.text ? JSON.parse(response.text) : {};
  }
  return {};
}

function normalizeConfig(input) {
  const config = { ...DEFAULT_CONFIG, ...(input || {}) };
  config.apiBase = normalizeBaseUrl(config.apiBase || DEFAULT_CONFIG.apiBase);
  config.siteBase = normalizeBaseUrl(config.siteBase || DEFAULT_CONFIG.siteBase);
  config.apiKey = String(config.apiKey || '').trim();
  config.homeLimit = clampNumber(config.homeLimit, DEFAULT_CONFIG.homeLimit, 1, 80);
  config.pageSize = clampNumber(config.pageSize, DEFAULT_CONFIG.pageSize, 1, 80);
  config.timeoutMs = clampNumber(config.timeoutMs, DEFAULT_CONFIG.timeoutMs, 3000, 60000);
  config.categories = Array.isArray(config.categories) && config.categories.length
    ? config.categories
    : DEFAULT_CONFIG.categories;
  config.filters = config.filters && typeof config.filters === 'object' && !Array.isArray(config.filters)
    ? config.filters
    : {};
  return config;
}

function apiGet(path, query) {
  const url = buildUrl(state.config.apiBase, path, query);
  const headers = { Accept: 'application/json' };
  if (state.config.apiKey) headers.Authorization = `Bearer ${state.config.apiKey}`;
  const response = requestText(url, { headers, timeoutMs: state.config.timeoutMs });
  let json;
  try {
    json = response.text ? JSON.parse(response.text) : {};
  } catch {
    throw new Error(`DDYS API returned non-JSON response: HTTP ${response.status || 0}`);
  }
  if ((response.status && response.status >= 400) || json.success === false) {
    throw new Error(json.message || `DDYS API HTTP ${response.status || 0}`);
  }
  return json;
}

function safeApi(path, fallback) {
  try {
    return apiGet(path);
  } catch {
    return { success: true, data: fallback };
  }
}

function requestText(url, options) {
  if (state.transport) return normalizeResponse(state.transport(url, options || {}));
  const reqFn = globalThis.req || globalThis.request;
  if (typeof reqFn === 'function') return normalizeResponse(reqFn(url, {
    method: 'GET',
    headers: (options && options.headers) || {},
    timeout: (options && options.timeoutMs) || DEFAULT_CONFIG.timeoutMs
  }));
  throw new Error('No synchronous request helper is available. TVBox/FongMi runtimes should provide req().');
}

function normalizeResponse(response) {
  if (typeof response === 'string') return { status: 200, text: response };
  if (!response || typeof response !== 'object') return { status: 0, text: '' };
  if (typeof response.content === 'string') return { status: Number(response.status || response.code || 200), text: response.content };
  if (typeof response.body === 'string') return { status: Number(response.status || response.code || 200), text: response.body };
  if (typeof response.data === 'string') return { status: Number(response.status || response.code || 200), text: response.data };
  if (typeof response.text === 'string') return { status: Number(response.status || response.code || 200), text: response.text };
  return { status: Number(response.status || response.code || 200), text: stringify(response) };
}

function buildUrl(baseUrl, path, query) {
  const url = `${normalizeBaseUrl(baseUrl)}${path.startsWith('/') ? path : `/${path}`}`;
  const params = [];
  for (const key of Object.keys(query || {})) {
    const value = query[key];
    if (value === undefined || value === null || value === '') continue;
    params.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return params.length ? `${url}?${params.join('&')}` : url;
}

function unwrapData(envelope) {
  return envelope && envelope.data !== undefined ? envelope.data : envelope;
}

function unwrapPaged(envelope) {
  const data = Array.isArray(envelope && envelope.data) ? envelope.data : [];
  const meta = envelope && envelope.meta && typeof envelope.meta === 'object' ? envelope.meta : {};
  return {
    data,
    meta: {
      total: Number(meta.total || data.length || 0),
      page: Number(meta.page || 1),
      per_page: Number(meta.per_page || data.length || state.config.pageSize),
      total_pages: Number(meta.total_pages || meta.last_page || 1)
    }
  };
}

function pagedResult(items, page, pagecount, total) {
  return {
    page,
    pagecount: Number(pagecount || 1),
    limit: state.config.pageSize,
    total: Number(total || 0),
    list: toVodList(items)
  };
}

function toVodList(items) {
  return (Array.isArray(items) ? items : []).map((item) => {
    const movie = normalizeMovie(item);
    return {
      vod_id: movie.slug,
      vod_name: movie.title,
      vod_pic: movie.poster,
      vod_remarks: movie.remarks
    };
  }).filter((item) => item.vod_id && item.vod_name);
}

function toDetailVod(movie, sources, related) {
  const sourceGroups = buildSourceGroups(sources);
  const playFrom = sourceGroups.map((group) => group.name).join('$$$');
  const playUrl = sourceGroups.map((group) => group.items.map((item) => (
    `${sanitizeEpisodeName(item.name)}$${encodePlayId(item)}`
  )).join('#')).join('$$$');
  const relatedText = relatedSummary(related);
  return {
    vod_id: movie.slug,
    vod_name: movie.title,
    vod_pic: movie.poster,
    type_name: movie.typeName,
    vod_year: movie.year,
    vod_area: movie.area,
    vod_actor: movie.actor,
    vod_director: movie.director,
    vod_remarks: movie.remarks,
    vod_content: [movie.content, resourcesSummary(sourceGroups), relatedText].filter(Boolean).join('\n\n'),
    vod_play_from: playFrom || 'DDYS',
    vod_play_url: playUrl || `打开原站$${encodePlayId({
      name: '打开原站',
      url: movie.url,
      parse: 1
    })}`
  };
}

function normalizeMovie(input) {
  const item = input && typeof input === 'object' ? input : {};
  const slug = String(item.slug || item.vod_id || item.id || item.key || '').trim();
  const title = String(item.title || item.name || item.vod_name || item.title_cn || slug || '').trim();
  const poster = absoluteUrl(item.poster || item.pic || item.cover || item.vod_pic || item.image || '');
  const year = String(item.year || item.release_year || item.vod_year || '').trim();
  const area = joinValues(item.region || item.area || item.vod_area);
  const typeName = joinValues(item.type_name || item.type || item.category);
  const actor = joinValues(item.actor || item.actors || item.cast || item.vod_actor);
  const director = joinValues(item.director || item.directors || item.vod_director);
  const content = String(item.intro || item.description || item.summary || item.content || item.vod_content || '').trim();
  const remarks = joinValues(item.remarks || item.vod_remarks || item.episode || item.episode_text || item.score || year);
  const sitePath = item.url || item.link || item.href || (slug ? `/movie/${slug}` : '');
  return {
    slug,
    title,
    poster,
    year,
    area,
    typeName,
    actor,
    director,
    content,
    remarks,
    url: absoluteUrl(sitePath, state.config.siteBase)
  };
}

function buildSourceGroups(input) {
  const sources = input && typeof input === 'object' ? input : {};
  const groups = [];
  addGroup(groups, '在线播放', collectArrays(sources, ['online', 'play', 'playlist', 'episodes']));
  addGroup(groups, '下载资源', collectArrays(sources, ['download', 'downloads']));
  addGroup(groups, '网盘资源', collectArrays(sources, ['cloud', 'netdisk', 'drive']));
  const used = new Set(['online', 'play', 'playlist', 'episodes', 'download', 'downloads', 'cloud', 'netdisk', 'drive']);
  for (const key of Object.keys(sources)) {
    if (!used.has(key) && Array.isArray(sources[key])) addGroup(groups, readableGroupName(key), sources[key]);
  }
  return groups.filter((group) => group.items.length);
}

function addGroup(groups, name, items) {
  const normalized = (Array.isArray(items) ? items : []).map((item, index) => normalizeResource(item, index)).filter((item) => item.url);
  if (normalized.length) groups.push({ name, items: normalized });
}

function collectArrays(source, keys) {
  const out = [];
  for (const key of keys) {
    if (Array.isArray(source[key])) out.push(...source[key]);
  }
  return out;
}

function normalizeResource(input, index) {
  if (typeof input === 'string') {
    return {
      name: `资源${index + 1}`,
      url: input,
      parse: isDirectMedia(input) ? 0 : 1
    };
  }
  const item = input && typeof input === 'object' ? input : {};
  const url = String(item.url || item.link || item.href || item.play_url || item.download_url || item.magnet || item.ed2k || '').trim();
  const label = joinValues(item.name || item.title || item.label || item.episode || item.quality || item.format || `资源${index + 1}`);
  const code = item.extract_code || item.code || item.password || item.passcode;
  return {
    name: code ? `${label} 提取码:${code}` : label,
    url,
    parse: isDirectMedia(url) ? 0 : 1,
    header: item.headers || item.header || undefined
  };
}

function resourcesSummary(groups) {
  const lines = [];
  for (const group of groups) {
    lines.push(`${group.name}:`);
    for (const item of group.items) lines.push(`- ${item.name} ${item.url}`);
  }
  return lines.join('\n');
}

function relatedSummary(input) {
  if (!input || typeof input !== 'object') return '';
  const related = []
    .concat(Array.isArray(input.related) ? input.related : [])
    .concat(Array.isArray(input.series) ? input.series : [])
    .map((item) => normalizeMovie(item).title)
    .filter(Boolean)
    .slice(0, 8);
  return related.length ? `相关内容: ${related.join(' / ')}` : '';
}

function encodePlayId(item) {
  return encodeURIComponent(stringify({
    name: item.name,
    url: item.url,
    parse: item.parse,
    header: item.header
  }));
}

function decodePlayId(id) {
  const text = decodeURIComponent(String(id || ''));
  if (!text.startsWith('{')) return { url: text };
  return JSON.parse(text);
}

function normalizeId(ids) {
  if (Array.isArray(ids)) return String(ids[0] || '').trim();
  if (typeof ids === 'string') {
    const parts = ids.split(',');
    return String(parts[0] || '').trim();
  }
  return String(ids || '').trim();
}

function normalizeExtend(input) {
  if (!input) return {};
  if (typeof input === 'object') return input;
  try {
    return JSON.parse(String(input));
  } catch {
    return {};
  }
}

function isDirectMedia(url) {
  return /\.(m3u8|mp4|mkv|mov|flv|avi|ts)(\?|#|$)/i.test(String(url || ''));
}

function absoluteUrl(value, base = state.config.apiBase) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) return text;
  if (text.startsWith('//')) return `https:${text}`;
  if (text.startsWith('/')) return `${normalizeBaseUrl(base)}${text}`;
  return text;
}

function normalizeBaseUrl(value) {
  return String(value || '').replace(/\/+$/, '');
}

function joinValues(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(' / ');
  return String(value || '').trim();
}

function readableGroupName(key) {
  const names = {
    quark: '夸克资源',
    aliyun: '阿里云盘',
    baidu: '百度网盘',
    magnet: '磁力资源',
    other: '其他资源'
  };
  return names[key] || key;
}

function sanitizeEpisodeName(value) {
  return String(value || '资源').replace(/[$#]/g, ' ').trim() || '资源';
}

function clampPage(value) {
  return Math.max(1, Number.parseInt(value || '1', 10) || 1);
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function stringify(value) {
  return JSON.stringify(value);
}

const spider = {
  init,
  home,
  homeVod,
  category,
  detail,
  search,
  play,
  homeContent,
  homeVideoContent,
  categoryContent,
  detailContent,
  searchContent,
  playerContent,
  destroy,
  setTransport,
  getConfig,
  getLastError
};

function __jsEvalReturn() {
  return spider;
}

export {
  init,
  home,
  homeVod,
  category,
  detail,
  search,
  play,
  homeContent,
  homeVideoContent,
  categoryContent,
  detailContent,
  searchContent,
  playerContent,
  destroy,
  setTransport,
  getConfig,
  getLastError,
  __jsEvalReturn
};

export default spider;
