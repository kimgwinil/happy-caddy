// 점검용: Overpass 응답 시간 확인
module.exports = async (req, res) => {
  const q = req.query.q || '[out:json][timeout:50];area["ISO3166-1"="KR"][admin_level=2]->.a;nwr[leisure=golf_course](area.a);out count;';
  const t0 = Date.now(); let out;
  try {
    const r = await fetch(req.query.m || 'https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q),
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'HappyCaddy/1.0' }, signal: AbortSignal.timeout(55000) });
    out = { status: r.status, body: (await r.text()).slice(0, 1500) };
  } catch (e) { out = { err: String(e) }; }
  res.status(200).json({ ms: Date.now() - t0, ...out });
};
