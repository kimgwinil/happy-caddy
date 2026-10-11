// 전국 골프장 목록을 OpenStreetMap(Overpass)에서 받아 app/data/clubs.json 으로 저장합니다.
// GitHub Actions(.github/workflows/clubs.yml)가 매달 실행합니다. 데이터 © OpenStreetMap 기여자 (ODbL).
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';

const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const QUERY_CLUBS = `[out:json][timeout:600];
area["ISO3166-2"~"^KR-"][admin_level=4]->.provs;
foreach.provs->.p(
  .p out tags;
  nwr[leisure=golf_course](area.p);
  out center tags;
);`;
const SKIP = /파크\s*골프|park\s*golf|그라운드\s*골프|미니\s*골프|mini\s*golf|연습장|driving|스크린|게이트볼|골프존\s*파크|아카데미|academy|스튜디오|studio|레슨|^골프장$|^[A-Z0-9]{3,5}$/i;
// 코스 하나만 따로 표시된 것(예: 'HILL Course', '파인코스')은 골프장이 아니므로 뺍니다.
const PART = s => /(코스|course)$/i.test(s) && s.replace(/\s/g, '').length <= 10 && !/(CC|GC|골프|컨트리|클럽|리조트)/i.test(s);
const PROV = { 'KR-11': '서울', 'KR-26': '부산', 'KR-27': '대구', 'KR-28': '인천', 'KR-29': '광주', 'KR-30': '대전', 'KR-31': '울산', 'KR-50': '세종',
  'KR-41': '경기', 'KR-42': '강원', 'KR-51': '강원', 'KR-43': '충북', 'KR-44': '충남', 'KR-45': '전북', 'KR-52': '전북', 'KR-46': '전남', 'KR-47': '경북', 'KR-48': '경남', 'KR-49': '제주' };
const clean = s => (s || '').replace(/\s+/g, ' ').trim();

// 골프장 안의 홀(golf=hole: 번호·파)을 골프장별로 받습니다.
const HOLES = `[out:json][timeout:900];
area["ISO3166-1"="KR"][admin_level=2]->.kr;
(way[leisure=golf_course](area.kr);relation[leisure=golf_course](area.kr););
foreach->.c(
  .c out ids tags;
  .c map_to_area->.a;
  way[golf=hole](area.a);
  out tags;
);`;

// 시·군·구(admin_level=6)마다 그 안의 골프장을 받습니다. 지역 이름(예: 용인, 가평)으로 찾기 위해 씁니다.
const CITIES = `[out:json][timeout:900];
area["ISO3166-1"="KR"][admin_level=2]->.kr;
rel(area.kr)[boundary=administrative][admin_level=6];
map_to_area->.cities;
foreach.cities->.c(
  .c out tags;
  nwr[leisure=golf_course](area.c);
  out ids tags;
);`;

async function overpass(QUERY = QUERY_CLUBS, min = 100) {
  for (let round = 0; round < 3; round++) {
    for (const url of MIRRORS) {
      try {
        const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(QUERY),
          headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'HappyCaddy/1.0 (github.com/kimgwinil/happy-caddy)' },
          signal: AbortSignal.timeout(700000) });
        const txt = await r.text();
        console.log(url, r.status, txt.length);
        if (r.ok) { const d = JSON.parse(txt); if ((d.elements || []).length > min) return d; }
      } catch (e) { console.log(url, String(e)); }
    }
    await new Promise(r => setTimeout(r, 30000));
  }
  throw new Error('Overpass unavailable');
}

const data = await overpass();

// 홀 정보 → 9홀 코스 묶음 [{ n: 코스이름, p: [파 9개] }]
function ninesOf(holes) {
  const hs = holes.map(t => ({ ref: parseInt(t.ref, 10), par: parseInt(t.par, 10), name: clean(t.name || t['name:ko'] || '') }))
    .filter(h => h.ref >= 1 && h.ref <= 36 && h.par >= 3 && h.par <= 6);
  const out = [];
  const nine = (n, list) => { const byRef = new Map(list.map(h => [h.ref, h.par])); const refs = [...byRef.keys()].sort((a, b) => a - b);
    if (refs.length !== 9) return; const p = refs.map(r => byRef.get(r));
    // 말이 안 되는 자료(합계 파가 33~38 밖이거나 모두 같은 파)는 버립니다.
    const sum = p.reduce((a, b) => a + b, 0); if (sum < 33 || sum > 38 || new Set(p).size === 1) return;
    out.push({ n, p }); };
  // 홀 이름에 코스 이름이 있으면(예: '동 3', 'Lake 7') 그것으로 나눕니다.
  const prefix = h => h.name.replace(/(\d+)\s*(번)?\s*(홀|hole)?/gi, '').replace(/\b(hole|no\.?)\b/gi, '').replace(/[#\-_.]/g, ' ').trim();
  const groups = new Map(); for (const h of hs) { const k = prefix(h); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(h); }
  const named = [...groups.entries()].filter(([k, l]) => k && new Set(l.map(h => h.ref)).size >= 9);
  if (named.length >= 2) {
    for (const [k, l] of named) { const refs = [...new Set(l.map(h => h.ref))].sort((a, b) => a - b);
      for (let i = 0; i + 9 <= refs.length; i += 9) nine(refs.length > 9 ? k + ' ' + (i / 9 + 1) : k, l.filter(h => refs.slice(i, i + 9).includes(h.ref))); }
    return out;
  }
  // 아니면 홀 번호로: 1~9 전반(OUT), 10~18 후반(IN), 19~27 세 번째 코스
  const names = ['OUT', 'IN', '3코스', '4코스'];
  const uniq = new Map(); for (const h of hs) if (!uniq.has(h.ref)) uniq.set(h.ref, h);
  for (let i = 0; i < 4; i++) nine(names[i], [...uniq.values()].filter(h => h.ref > i * 9 && h.ref <= i * 9 + 9));
  return out;
}
let holeInfo = new Map();
try {
  const hd = await overpass(HOLES, 10);
  let cur = null, nHoles = 0;
  for (const el of hd.elements) {
    const tg = el.tags || {};
    if (tg.leisure === 'golf_course') { cur = { name: clean(tg['name:ko'] || tg.name), holes: [] }; if (cur.name) holeInfo.set(cur.name.replace(/\s/g, ''), cur); continue; }
    if (cur && tg.golf === 'hole') { cur.holes.push(tg); nHoles++; }
  }
  console.log('holes', nHoles, 'courses with holes', [...holeInfo.values()].filter(c => c.holes.length).length);
} catch (e) { console.log('holes query failed', String(e)); }
// 골프장 → 시·군 이름. 받기에 실패하면 지난번 자료의 시·군을 그대로 씁니다.
const cityOf = new Map();
try { for (const x of JSON.parse(readFileSync('app/data/clubs.json', 'utf8')).list) if (x.c) cityOf.set(x.n.replace(/\s/g, ''), x.c); } catch {}
try {
  const cd = await overpass(CITIES, 100); let city = '', n = 0;
  for (const el of cd.elements) {
    const tg = el.tags || {};
    if (el.type === 'area') { city = clean(tg['name:ko'] || tg.name).replace(/^.*\s/, ''); continue; }
    if (!city) continue;
    cityOf.set(el.type + el.id, city);
    const nm = clean(tg['name:ko'] || tg.name).replace(/\s*클럽하우스$/, '').replace(/\s/g, '');
    if (nm) { cityOf.set(nm, city); n++; }
  }
  console.log('city matches', n);
} catch (e) { console.log('city query failed', String(e)); }
const seen = new Map(); let region = '';
for (const el of data.elements) {
  const tg = el.tags || {};
  if (el.type === 'area') { region = PROV[tg['ISO3166-2']] || clean(tg['name:ko'] || tg.name); continue; }
  const name = clean(tg['name:ko'] || tg.name).replace(/\s*클럽하우스$/, '');
  if (!name || SKIP.test(name) || PART(name) || ['driving_range', 'miniature'].includes(tg.golf) || tg.sport === 'miniature_golf') continue;
  const site = clean(tg.website || tg['contact:website'] || tg.url);
  const key = name.replace(/\s/g, '');
  const prev = seen.get(key);
  if (prev) { if (!prev.w && site) prev.w = site; if (!prev.c && cityOf.get(el.type + el.id)) prev.c = cityOf.get(el.type + el.id); continue; }
  const c = el.center || el, en = clean(tg['name:en']);
  const o = { n: name, r: region };
  const city = cityOf.get(el.type + el.id) || cityOf.get(key);
  if (city) o.c = city;
  if (site) o.w = site;
  if (en && en !== name) o.en = en;
  if (c.lat) { o.la = +c.lat.toFixed(4); o.lo = +c.lon.toFixed(4); }
  if (+tg.holes) o.h = +tg.holes;
  const hi = holeInfo.get(key);
  if (hi && hi.holes.length) { const cs = ninesOf(hi.holes); if (cs.length) { o.cs = cs; o.h = o.h || cs.length * 9; } else if (!o.h) o.h = new Set(hi.holes.map(h => h.ref)).size || undefined; }
  seen.set(key, o);
}
const list = [...seen.values()].sort((a, b) => a.n.localeCompare(b.n, 'ko'));
mkdirSync('app/data', { recursive: true });
writeFileSync('app/data/clubs.json', JSON.stringify({ v: 1, src: 'OpenStreetMap contributors (ODbL)', at: new Date().toISOString().slice(0, 10), n: list.length, list }));
console.log('clubs', list.length, 'with website', list.filter(x => x.w).length, 'with holes', list.filter(x => x.h).length, 'with courses', list.filter(x => x.cs).length, 'with city', list.filter(x => x.c).length);
