// 사용자끼리 같이 쓰는 골프장 코스(9홀씩 홀별 파).
// 누가 코스를 등록하면 저장해 두고, 같은 골프장을 고른 다른 사람에게 보여 줍니다.
// 저장소: Vercel Blob (프로젝트에 Blob 저장소를 연결해야 동작, 없으면 { off: true })
//   GET  /api/shared?club=골프장이름        → { cs: [{ n, p[9] }], at }
//   POST /api/shared  { club, cs }          → { ok: true }
const crypto = require('crypto');

const norm = s => String(s || '').toLowerCase().replace(/\s|\(.*?\)/g, '');
const pathOf = club => 'courses/' + crypto.createHash('sha1').update(norm(club)).digest('hex') + '.json';

function valid(cs) {
  if (!Array.isArray(cs) || cs.length > 8) return null;
  const out = [];
  for (const c of cs) {
    const n = String(c && c.n || '').trim().slice(0, 16);
    const p = Array.isArray(c && c.p) ? c.p.map(Number) : [];
    if (!n || p.length !== 9 || p.some(x => !(x >= 3 && x <= 6))) return null;
    out.push({ n, p });
  }
  return out;
}

async function readJson(blob, path) {
  for (const access of ['private', 'public']) {
    try {
      const r = await blob.get(path, { access, useCache: false });
      if (r && r.stream) return await new Response(r.stream).json();
      if (r === null) return null;
    } catch (e) { if (e && /not ?found/i.test(e.name + e.message)) return null; }
  }
  return null;
}
async function writeJson(blob, path, data) {
  let last;
  for (const access of ['private', 'public']) {
    try { await blob.put(path, JSON.stringify(data), { access, addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60 }); return; }
    catch (e) { last = e; }
  }
  throw last;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) { res.status(200).json({ off: true }); return; }
  const blob = require('@vercel/blob');
  try {
    if (req.method === 'GET' && req.query.selftest) {   // 임시 점검: 쓰고 다시 읽기
      const t0 = { club: '__selftest', cs: [{ n: 'T', p: [4, 4, 3, 5, 4, 4, 3, 4, 5] }], at: new Date().toISOString() };
      await writeJson(blob, 'courses/__selftest.json', t0); const back = await readJson(blob, 'courses/__selftest.json');
      res.status(200).json({ wrote: t0.at, read: back && back.at }); return;
    }
    if (req.method === 'GET') {
      const club = String(req.query.club || '').slice(0, 60);
      if (!norm(club)) { res.status(400).json({ error: 'club' }); return; }
      const d = await readJson(blob, pathOf(club));
      res.status(200).json(d && d.cs ? { cs: d.cs, at: d.at } : { cs: [] });
      return;
    }
    if (req.method === 'POST') {
      let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
      const club = String(body && body.club || '').slice(0, 60), cs = valid(body && body.cs);
      if (!norm(club) || !cs) { res.status(400).json({ error: 'bad data' }); return; }
      await writeJson(blob, pathOf(club), { club, cs, at: new Date().toISOString() });
      res.status(200).json({ ok: true });
      return;
    }
    res.status(405).json({ error: 'method' });
  } catch (e) {
    res.status(200).json({ error: String(e && e.message || e) });
  }
};
