// 골프장 홈페이지의 대표 사진 주소를 찾아 그쪽으로 넘겨 줍니다(사진은 복사하지 않고 홈페이지에서 바로 불러옴).
// 사용법: /api/photo?site=https://www.example-cc.co.kr  →  302 로 홈페이지 사진 주소
//         /api/photo?site=...&json=1                     →  { img: "..." }
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function abs(u, base) { try { return new URL(u.replace(/&amp;/g, '&'), base).href; } catch (e) { return ''; } }

function pick(html, base) {
  const meta = (p) => {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]*>`, 'i');
    const m = html.match(re); if (!m) return '';
    const c = m[0].match(/content=["']([^"']+)["']/i); return c ? c[1] : '';
  };
  let u = meta('og:image') || meta('og:image:url') || meta('twitter:image');
  if (u) return abs(u, base);
  // 메타 태그가 없으면 첫 화면의 큰 사진(배경 그림 포함)을 찾습니다.
  const cands = [];
  for (const m of html.matchAll(/url\(\s*['"]?([^'")]+\.(?:jpe?g|png|webp))['"]?\s*\)/gi)) cands.push(m[1]);
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+\.(?:jpe?g|webp|png))["']/gi)) cands.push(m[1]);
  const good = cands.find(c => /main|visual|slide|banner|bg|course|hero|key|top/i.test(c) && !/logo|icon|btn|sns|qr/i.test(c))
    || cands.find(c => /\.jpe?g/i.test(c) && !/logo|icon|btn|sns|qr/i.test(c));
  return good ? abs(good, base) : '';
}

async function get(url) {
  const r = await fetch(url, { redirect: 'follow', headers: { 'user-agent': UA, 'accept-language': 'ko-KR,ko;q=0.9' }, signal: AbortSignal.timeout(8000) });
  const buf = await r.arrayBuffer();
  let html = new TextDecoder('utf-8').decode(buf);
  if (/charset=["']?euc-kr/i.test(html)) { try { html = new TextDecoder('euc-kr').decode(buf); } catch (e) {} }
  return { html, url: r.url || url };
}

module.exports = async (req, res) => {
  let site = String(req.query.site || '').trim();
  if (!/^https?:\/\//i.test(site)) site = 'http://' + site;
  let host; try { host = new URL(site).hostname; } catch (e) { host = ''; }
  if (!host || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) || !host.includes('.')) {
    res.status(400).json({ error: 'bad site' }); return;
  }
  let img = '';
  try {
    let { html, url } = await get(site);
    img = pick(html, url);
    // 첫 페이지가 프레임/리다이렉트만 있으면 한 번 더 따라갑니다.
    if (!img) {
      const f = html.match(/<(?:frame|iframe)[^>]+src=["']([^"']+)["']/i) || html.match(/location(?:\.href)?\s*=\s*["']([^"']+)["']/i)
        || html.match(/http-equiv=["']refresh["'][^>]+url=([^"'>\s]+)/i);
      if (f) { const g = await get(abs(f[1], url)); img = pick(g.html, g.url); }
    }
  } catch (e) { img = ''; }
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!img) { res.setHeader('Cache-Control', 'public, s-maxage=86400'); res.status(req.query.json ? 200 : 404).json({ img: '' }); return; }
  res.setHeader('Cache-Control', 'public, s-maxage=2592000, stale-while-revalidate=2592000');
  if (req.query.json) { res.status(200).json({ img }); return; }
  res.setHeader('Location', img); res.status(302).end();
};
