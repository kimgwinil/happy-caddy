// 전국 골프장 목록을 OpenStreetMap(Overpass)에서 받아 app/data/clubs.json 으로 저장합니다.
// GitHub Actions(.github/workflows/clubs.yml)가 매달 실행합니다. 데이터 © OpenStreetMap 기여자 (ODbL).
import { writeFileSync, mkdirSync } from 'node:fs';

const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const QUERY = `[out:json][timeout:600];
area["ISO3166-2"~"^KR-"][admin_level=4]->.provs;
foreach.provs->.p(
  .p out tags;
  nwr[leisure=golf_course](area.p);
  out center tags;
);`;
const SKIP = /파크\s*골프|park\s*golf|그라운드\s*골프|미니\s*골프|mini\s*golf|연습장|driving|스크린|게이트볼/i;
const PROV = { 'KR-11': '서울', 'KR-26': '부산', 'KR-27': '대구', 'KR-28': '인천', 'KR-29': '광주', 'KR-30': '대전', 'KR-31': '울산', 'KR-50': '세종',
  'KR-41': '경기', 'KR-42': '강원', 'KR-51': '강원', 'KR-43': '충북', 'KR-44': '충남', 'KR-45': '전북', 'KR-52': '전북', 'KR-46': '전남', 'KR-47': '경북', 'KR-48': '경남', 'KR-49': '제주' };
const clean = s => (s || '').replace(/\s+/g, ' ').trim();

async function overpass() {
  for (let round = 0; round < 3; round++) {
    for (const url of MIRRORS) {
      try {
        const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(QUERY),
          headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'HappyCaddy/1.0 (github.com/kimgwinil/happy-caddy)' },
          signal: AbortSignal.timeout(700000) });
        const txt = await r.text();
        console.log(url, r.status, txt.length);
        if (r.ok) { const d = JSON.parse(txt); if ((d.elements || []).length > 100) return d; }
      } catch (e) { console.log(url, String(e)); }
    }
    await new Promise(r => setTimeout(r, 30000));
  }
  throw new Error('Overpass unavailable');
}

const data = await overpass();
const seen = new Map(); let region = '';
for (const el of data.elements) {
  const tg = el.tags || {};
  if (el.type === 'area') { region = PROV[tg['ISO3166-2']] || clean(tg['name:ko'] || tg.name); continue; }
  const name = clean(tg['name:ko'] || tg.name);
  if (!name || SKIP.test(name) || ['driving_range', 'miniature'].includes(tg.golf) || tg.sport === 'miniature_golf') continue;
  const site = clean(tg.website || tg['contact:website'] || tg.url);
  const key = name.replace(/\s/g, '');
  const prev = seen.get(key);
  if (prev) { if (!prev.w && site) prev.w = site; continue; }
  const c = el.center || el, en = clean(tg['name:en']);
  const o = { n: name, r: region };
  if (site) o.w = site;
  if (en && en !== name) o.en = en;
  if (c.lat) { o.la = +c.lat.toFixed(4); o.lo = +c.lon.toFixed(4); }
  if (tg.holes) o.h = +tg.holes || undefined;
  seen.set(key, o);
}
const list = [...seen.values()].sort((a, b) => a.n.localeCompare(b.n, 'ko'));
mkdirSync('app/data', { recursive: true });
writeFileSync('app/data/clubs.json', JSON.stringify({ v: 1, src: 'OpenStreetMap contributors (ODbL)', at: new Date().toISOString().slice(0, 10), n: list.length, list }));
console.log('clubs', list.length, 'with website', list.filter(x => x.w).length);
