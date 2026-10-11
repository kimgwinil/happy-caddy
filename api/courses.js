// 전국 골프장 목록: OpenStreetMap(Overpass)에서 시·도별로 모아 JSON으로 돌려줍니다.
// 결과는 Vercel 엣지에 1주일 캐시되므로 Overpass를 자주 부르지 않습니다.
const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];
const QUERY = `[out:json][timeout:120];
area["ISO3166-2"~"^KR-"][admin_level=4]->.provs;
foreach.provs->.p(
  .p out tags;
  nwr[leisure=golf_course](area.p);
  out center tags;
);`;

const SKIP = /파크\s*골프|park\s*golf|그라운드\s*골프|미니\s*골프|mini\s*golf|연습장|driving|스크린/i;
const PROV = { 'KR-11': '서울', 'KR-26': '부산', 'KR-27': '대구', 'KR-28': '인천', 'KR-29': '광주', 'KR-30': '대전', 'KR-31': '울산', 'KR-50': '세종',
  'KR-41': '경기', 'KR-42': '강원', 'KR-51': '강원', 'KR-43': '충북', 'KR-44': '충남', 'KR-45': '전북', 'KR-52': '전북', 'KR-46': '전남', 'KR-47': '경북', 'KR-48': '경남', 'KR-49': '제주' };

async function overpass() {
  let last;
  for (const url of MIRRORS) {
    try {
      const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(QUERY),
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'HappyCaddy/1.0 (golf score app)' } });
      if (r.ok) return await r.json();
      last = new Error(url + ' ' + r.status);
    } catch (e) { last = e; }
  }
  throw last;
}

function clean(s) { return (s || '').replace(/\s+/g, ' ').trim(); }

module.exports = async (req, res) => {
  try {
    const data = await overpass();
    const seen = new Map();
    let region = '';
    for (const el of data.elements || []) {
      const tg = el.tags || {};
      if (el.type === 'area') { region = PROV[tg['ISO3166-2']] || clean(tg['name:ko'] || tg.name); continue; }
      const name = clean(tg['name:ko'] || tg.name);
      if (!name || SKIP.test(name) || tg.golf === 'driving_range' || tg.golf === 'miniature') continue;
      const site = clean(tg.website || tg['contact:website'] || tg.url);
      const key = name.replace(/\s/g, '');
      const prev = seen.get(key);
      if (prev) { if (!prev.w && site) prev.w = site; continue; }
      const c = el.center || el;
      seen.set(key, { n: name, r: region, w: site || undefined, en: tg['name:en'] && tg['name:en'] !== name ? clean(tg['name:en']) : undefined,
        la: c.lat ? +c.lat.toFixed(4) : undefined, lo: c.lon ? +c.lon.toFixed(4) : undefined });
    }
    const list = [...seen.values()].sort((a, b) => a.n.localeCompare(b.n, 'ko'));
    res.setHeader('Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=2592000');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ v: 1, at: new Date().toISOString(), n: list.length, list });
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ list: [], error: String(e && e.message || e) });
  }
};
