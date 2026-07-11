import test from 'node:test';
import assert from 'node:assert/strict';
import spider, { __jsEvalReturn } from '../spider/ddys.js';

const fixtures = {
  latest: [
    { slug: 'latest-one', title: '最新电影', poster: 'https://img.example/latest.jpg', year: 2026, remarks: 'HD' }
  ],
  hot: [
    { slug: 'hot-one', title: '热门剧集', poster: 'https://img.example/hot.jpg', episode: '更新至 8 集' }
  ],
  movies: [
    { slug: 'movie-one', title: '分类电影', poster: '/poster.jpg', region: '美国', year: 2025 }
  ],
  search: [
    { slug: 'search-one', title: '搜索结果', poster: 'https://img.example/search.jpg' }
  ],
  detail: {
    slug: 'movie-one',
    title: '分类电影',
    poster: 'https://img.example/detail.jpg',
    year: 2025,
    region: '美国',
    type_name: '电影',
    actor: ['演员 A', '演员 B'],
    director: '导演 A',
    intro: '这是一部测试影片。'
  },
  sources: {
    online: [
      { name: '正片', url: 'https://cdn.example/video.m3u8', quality: 'HD' }
    ],
    cloud: [
      { name: '夸克网盘', url: 'https://pan.example/share', extract_code: '1234' }
    ]
  },
  related: {
    related: [
      { slug: 'related-one', title: '相关影片' }
    ]
  }
};

function installMock() {
  const calls = [];
  spider.setTransport((url, options) => {
    calls.push({ url, options });
    const parsed = new URL(url);
    const path = parsed.pathname.replace('/api/v1', '');
    if (path === '/latest') return envelope(fixtures.latest);
    if (path === '/hot') return envelope(fixtures.hot);
    if (path === '/movies') return envelope(fixtures.movies, { total: 1, page: 1, per_page: 24, total_pages: 1 });
    if (path === '/search') return envelope(fixtures.search, { total: 1, page: 1, per_page: 24, total_pages: 1 });
    if (path === '/movies/movie-one') return envelope(fixtures.detail);
    if (path === '/movies/movie-one/sources') return envelope(fixtures.sources);
    if (path === '/movies/movie-one/related') return envelope(fixtures.related);
    return { status: 404, text: JSON.stringify({ success: false, message: 'not found' }) };
  });
  return calls;
}

function envelope(data, meta) {
  return { status: 200, text: JSON.stringify({ success: true, data, meta }) };
}

test('exports CatVod-compatible object', () => {
  const instance = __jsEvalReturn();
  assert.equal(instance, spider);
  for (const method of ['homeContent', 'homeVideoContent', 'categoryContent', 'detailContent', 'searchContent', 'playerContent']) {
    assert.equal(typeof instance[method], 'function');
  }
});

test('homeContent returns categories and filters', () => {
  spider.init({
    apiBase: 'https://example.com/api/v1',
    siteBase: 'https://ddys.io',
    apiKey: 'ddys_test_key',
    filters: {
      movie: [{ key: 'sort', name: '排序', value: [{ n: '最新', v: 'latest' }] }]
    }
  });
  const result = JSON.parse(spider.homeContent(true));
  assert.ok(result.class.some((item) => item.type_id === 'movie'));
  assert.equal(result.filters.movie[0].key, 'sort');
});

test('home, category, and search request DDYS API', () => {
  const calls = installMock();
  spider.init({ apiBase: 'https://example.com/api/v1', siteBase: 'https://ddys.io', apiKey: 'ddys_test_key' });
  spider.setTransport((url, options) => {
    calls.push({ url, options });
    const parsed = new URL(url);
    const path = parsed.pathname.replace('/api/v1', '');
    if (path === '/latest') return envelope(fixtures.latest);
    if (path === '/movies') return envelope(fixtures.movies, { total: 1, page: 1, per_page: 24, total_pages: 1 });
    if (path === '/search') return envelope(fixtures.search, { total: 1, page: 1, per_page: 24, total_pages: 1 });
    return envelope([]);
  });
  const home = JSON.parse(spider.homeVideoContent());
  const category = JSON.parse(spider.categoryContent('movie', '1', true, { sort: 'latest' }));
  const search = JSON.parse(spider.searchContent('测试', false, '1'));
  assert.equal(home.list[0].vod_name, '最新电影');
  assert.equal(category.list[0].vod_name, '分类电影');
  assert.equal(search.list[0].vod_name, '搜索结果');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer ddys_test_key');
});

test('detailContent builds resource groups and playerContent decodes play ids', () => {
  installMock();
  spider.init({ apiBase: 'https://example.com/api/v1', siteBase: 'https://ddys.io' });
  const detail = JSON.parse(spider.detailContent(['movie-one']));
  const vod = detail.list[0];
  assert.equal(vod.vod_name, '分类电影');
  assert.match(vod.vod_play_from, /在线播放/);
  assert.match(vod.vod_play_from, /网盘资源/);
  assert.match(vod.vod_content, /相关影片/);
  const firstPlayId = vod.vod_play_url.split('$$$')[0].split('#')[0].split('$')[1];
  const play = JSON.parse(spider.playerContent('在线播放', firstPlayId, []));
  assert.equal(play.parse, 0);
  assert.equal(play.url, 'https://cdn.example/video.m3u8');
});
