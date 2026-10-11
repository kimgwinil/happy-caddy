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
);
area["ISO3166-1"="KR"][admin_level=2]->.kr;
.kr out tags;
nwr[leisure=golf_course](area.kr);
out center tags;`;
// 도 경계가 지도에서 깨진 곳(전남·광주 등)은 위 도별 목록에 안 나오므로, 마지막에 전국 목록을 한 번 더 받아 빠진 골프장을 채웁니다.
const SKIP = /파크\s*골프|park\s*golf|그라운드\s*골프|미니\s*골프|mini\s*golf|연습장|driving|스크린|게이트볼|골프존\s*파크|아카데미|academy|스튜디오|studio|레슨|^골프장$|^[A-Z0-9]{3,5}$/i;
// 코스 하나만 따로 표시된 것(예: 'HILL Course', '파인코스')은 골프장이 아니므로 뺍니다.
const PART = s => /(코스|course)$/i.test(s) && s.replace(/\s/g, '').length <= 10 && !/(CC|GC|골프|컨트리|클럽|리조트)/i.test(s);
const PROV = { 'KR-11': '서울', 'KR-26': '부산', 'KR-27': '대구', 'KR-28': '인천', 'KR-29': '광주', 'KR-30': '대전', 'KR-31': '울산', 'KR-50': '세종',
  'KR-41': '경기', 'KR-42': '강원', 'KR-51': '강원', 'KR-43': '충북', 'KR-44': '충남', 'KR-45': '전북', 'KR-52': '전북', 'KR-46': '전남', 'KR-47': '경북', 'KR-48': '경남', 'KR-49': '제주' };
const PROV_FULL = { 서울특별시: '서울', 부산광역시: '부산', 대구광역시: '대구', 인천광역시: '인천', 광주광역시: '광주', 대전광역시: '대전', 울산광역시: '울산',
  세종특별자치시: '세종', 경기도: '경기', 강원도: '강원', 강원특별자치도: '강원', 충청북도: '충북', 충청남도: '충남', 전라북도: '전북', 전북특별자치도: '전북',
  전라남도: '전남', 경상북도: '경북', 경상남도: '경남', 제주특별자치도: '제주', 제주도: '제주' };
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
const cityOf = new Map(), cityNames = {}, before = new Map();
try { const old = JSON.parse(readFileSync('app/data/clubs.json', 'utf8')); Object.assign(cityNames, old.cities || {});
  for (const x of old.list) before.set(x.n.replace(/\s/g, ''), x); } catch {}
try {
  const cd = await overpass(CITIES, 100); let city = '', n = 0;
  for (const el of cd.elements) {
    const tg = el.tags || {};
    if (el.type === 'area') { city = clean(tg['name:ko'] || tg.name).replace(/^.*\s/, '');
      if (city && !cityNames[city] && tg['name:en']) cityNames[city] = [clean(tg['name:en']), clean(tg['name:ja'] || tg['name:en']), clean(tg['name:zh'] || tg['name:ja'] || tg['name:en'])];
      continue; }
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
  if (el.type === 'area') { region = tg['ISO3166-1'] ? '' : PROV[tg['ISO3166-2']] || clean(tg['name:ko'] || tg.name); continue; }
  const name = clean(tg['name:ko'] || tg.name).replace(/\s*클럽하우스$/, '');
  if (!name || SKIP.test(name) || PART(name) || ['driving_range', 'miniature'].includes(tg.golf) || tg.sport === 'miniature_golf') continue;
  const site = clean(tg.website || tg['contact:website'] || tg.url);
  const key = name.replace(/\s/g, '');
  const prev = seen.get(key);
  if (prev) { if (!prev.w && site) prev.w = site; if (!prev.c && cityOf.get(el.type + el.id)) prev.c = cityOf.get(el.type + el.id); if (!prev.r && region) prev.r = region; continue; }
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
// 시·군으로 도를 알아냅니다(같은 시·군의 다른 골프장이 속한 도).
const provOfCity = new Map();
for (const o of seen.values()) if (o.r && o.c) { const m = provOfCity.get(o.c) || {}; m[o.r] = (m[o.r] || 0) + 1; provOfCity.set(o.c, m); }
for (const o of seen.values()) {
  const old = before.get(o.n.replace(/\s/g, ''));
  if (!o.c && old && old.c) o.c = old.c;
  if (!o.r && o.c && provOfCity.has(o.c) && !/^(동|서|남|북|중)구$/.test(o.c)) { const m = provOfCity.get(o.c); o.r = Object.keys(m).sort((a, b) => m[b] - m[a])[0]; }
  if (!o.r && old && old.r) o.r = old.r;
}
// 그래도 도나 시·군을 모르면 좌표로 주소를 찾아 봅니다(Nominatim, 1초에 한 번, 한 번 실행에 최대 300곳).
let asked = 0;
for (const o of seen.values()) {
  if ((o.r && o.c) || !o.la || asked >= 300) continue;
  asked++;
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=ko&lat=${o.la}&lon=${o.lo}`,
      { headers: { 'user-agent': 'HappyCaddy/1.0 (github.com/kimgwinil/happy-caddy)' }, signal: AbortSignal.timeout(20000) });
    const a = (await r.json()).address || {};
    const vals = Object.values(a).map(clean);
    const prov = vals.map(v => PROV_FULL[v] || PROV_FULL[v.replace(/\s/g, '')]).find(Boolean);
    const city = [a.county, a.city, a.town, a.municipality, a.borough, a.city_district].map(clean)
      .find(v => v && /(시|군|구)$/.test(v) && !/(광역시|특별시|특별자치시)$/.test(v));
    if (!o.r && prov) o.r = prov;
    if (!o.c && city) o.c = city;
  } catch (e) { console.log('reverse failed', o.n, String(e)); }
  await new Promise(r => setTimeout(r, 1100));
}
console.log('reverse lookups', asked);
const list = [...seen.values()].sort((a, b) => a.n.localeCompare(b.n, 'ko'));
const usedCities = new Set(list.map(o => o.c).filter(Boolean));
for (const k of Object.keys(cityNames)) if (!usedCities.has(k)) delete cityNames[k];
mkdirSync('app/data', { recursive: true });
writeFileSync('app/data/clubs.json', JSON.stringify({ v: 1, src: 'OpenStreetMap contributors (ODbL)', at: new Date().toISOString().slice(0, 10), n: list.length, cities: cityNames, list }));
console.log('clubs', list.length, 'with website', list.filter(x => x.w).length, 'with holes', list.filter(x => x.h).length, 'with courses', list.filter(x => x.cs).length, 'with city', list.filter(x => x.c).length, 'no region', list.filter(x => !x.r).length);
const byR = {}; for (const x of list) byR[x.r || '?'] = (byR[x.r || '?'] || 0) + 1; console.log(byR);
