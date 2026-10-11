// 골프장 홈페이지의 대표(첫 화면) 사진 주소를 찾아 그쪽으로 넘겨 줍니다.
// 사진은 복사·저장하지 않고 브라우저가 홈페이지에서 직접 불러옵니다.
// 사용법: /api/photo?site=https://www.example-cc.co.kr  →  302 로 홈페이지 사진 주소
//         /api/photo?site=...&json=1                     →  { img: "..." }
//         /api/photo?site=...&json=1&list=1              →  { img, imgs: [후보 사진 8장] }
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const BAD = /logo|icon|(^|[\/_-])ico[_.-]|favicon|btn|button|sns|qr|banner_?s|bnr|popup|pop_|layer|notice|event|board|bbs|upload|arrow|blank|spacer|loading|symbol|_ci[._]|\/ci[._/]|kakao|naver|facebook|insta|youtube|thumb|award|map|txt|text|tit/i;
const GOOD = /main|visual|vis[_-]|slide|swiper|hero|key|mv[_-]?\d|bg|course|intro|top/i;

function abs(u, base) { try { return new URL(u.trim().replace(/&amp;/g, '&'), base).href; } catch (e) { return ''; } }
function meta(html, p) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]*>`, 'i');
  const m = html.match(re); if (!m) return '';
  const c = m[0].match(/content=["']([^"']+)["']/i); return c ? c[1] : '';
}
// 페이지(와 CSS)에서 사진 후보를 모아 점수를 매깁니다.
function candidates(text, base, from) {
  const out = [];
  const add = (u, w) => { if (!u || /^data:/.test(u) || !/\.(jpe?g|png|webp)(\?|$)/i.test(u)) return; const a = abs(u, base); if (a) out.push({ u: a, w, from }); };
  for (const m of text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) add(m[1], 1);
  for (const m of text.matchAll(/<(?:img|source)[^>]+?(?:data-src|data-original|data-lazy|src)=["']([^"']+)["']/gi)) add(m[1], 0);
  for (const m of text.matchAll(/(?:data-bg|data-background|data-image)=["']([^"']+)["']/gi)) add(m[1], 1);
  for (const m of text.matchAll(/["']([^"'\s()]+\/[^"'\s()]+\.(?:jpe?g|webp))["']/gi)) add(m[1], 0);
  return out;
}
function score(c) {
  const path = new URL(c.u).pathname, file = path.split('/').pop(), dir = path.slice(0, -file.length);
  let s = c.w;
  if (BAD.test(path)) s -= 10;
  if (GOOD.test(file)) s += 3; else if (GOOD.test(dir)) s += 1;
  if (/\.jpe?g$|\.webp$/i.test(file)) s += 1; else if (/\.png$/i.test(file)) s -= 1;
  if (/main|visual/i.test(file)) s += 2;
  return s;
}

async function get(url) {
  const r = await fetch(url, { redirect: 'follow', headers: { 'user-agent': UA, 'accept-language': 'ko-KR,ko;q=0.9' }, signal: AbortSignal.timeout(7000) });
  const buf = await r.arrayBuffer();
  let html = new TextDecoder('utf-8').decode(buf);
  if (/charset=["']?euc-kr/i.test(html.slice(0, 3000))) { try { html = new TextDecoder('euc-kr').decode(buf); } catch (e) {} }
  return { html, url: r.url || url };
}

async function find(site, debug) {
  let html, url;
  try { ({ html, url } = await get(site)); } catch (e) { ({ html, url } = await get(site.replace(/^https:/i, 'http:'))); }
  // 프레임이나 자바스크립트 이동만 있는 첫 페이지는 한 번 따라갑니다.
  if (html.length < 3000) {
    const f = html.match(/<(?:frame|iframe)[^>]+src=["']([^"']+)["']/i) || html.match(/location(?:\.href)?\s*=\s*["']([^"']+)["']/i)
      || html.match(/http-equiv=["']refresh["'][^>]+url=([^"'>\s;]+)/i);
    if (f) { const g = await get(abs(f[1], url)); html = g.html; url = g.url; }
  }
  const og = abs(meta(html, 'og:image') || meta(html, 'og:image:url') || meta(html, 'twitter:image'), url);
  let list = candidates(html, url, 'html');
  if (og && !/\/$/.test(new URL(og).pathname) && og.replace(/\/$/, '') !== url.replace(/\/$/, '')) list.push({ u: og, w: 2, from: 'og' });
  // 첫 화면 사진이 CSS 파일 안에 있는 경우가 많아서, 주요 CSS 몇 개도 봅니다.
  if (!list.some(c => score(c) >= 4)) {
    const css = [...html.matchAll(/<link[^>]+href=["']([^"']+\.css[^"']*)["']/gi)].map(m => abs(m[1], url))
      .filter(u => u && !/bootstrap|swiper|slick|font|jquery|aos|animate|reset|normalize/i.test(u))
      .sort((a, b) => (/main|index|layout|style|common/i.test(b) ? 1 : 0) - (/main|index|layout|style|common/i.test(a) ? 1 : 0)).slice(0, 4);
    for (const u of css) { try { const g = await get(u); list = list.concat(candidates(g.html, g.url, 'css')); } catch (e) {} }
  }
  const seen = new Set(); list = list.filter(c => !seen.has(c.u) && seen.add(c.u));
  list.forEach(c => c.s = score(c)); list.sort((a, b) => b.s - a.s);
  const best = list.find(c => c.s >= 1);
  const imgs = list.filter(c => c.s >= 1).slice(0, 8).map(c => c.u);
  return debug ? { img: best ? best.u : '', imgs, top: list.slice(0, 8) } : { img: best ? best.u : '', imgs };
}

module.exports = async (req, res) => {
  let site = String(req.query.site || '').trim();
  if (!/^https?:\/\//i.test(site)) site = 'http://' + site;
  let host; try { host = new URL(site).hostname; } catch (e) { host = ''; }
  if (!host || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) || !host.includes('.')) {
    res.status(400).json({ error: 'bad site' }); return;
  }
  let out = { img: '' };
  try { out = await find(site, !!req.query.debug); } catch (e) { out = { img: '', error: req.query.debug ? String(e) : undefined }; }
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!out.img) { res.setHeader('Cache-Control', 'public, s-maxage=86400'); res.status(req.query.json || req.query.debug ? 200 : 404).json(out); return; }
  res.setHeader('Cache-Control', 'public, s-maxage=2592000, stale-while-revalidate=2592000');
  if (req.query.json || req.query.debug) { if (!req.query.debug && !req.query.list) delete out.imgs; res.status(200).json(out); return; }
  res.setHeader('Location', out.img); res.status(302).end();
};
