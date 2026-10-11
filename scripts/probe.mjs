// 임시 점검: 공공데이터포털 골프장 자료 목록 확인
const ids = ['15160352', '15160491', '15160428', '15160548', '15113672', '15154975', '15154978', '15057950'];
for (const id of ids) {
  for (const u of [`https://www.data.go.kr/catalog/${id}/fileData.json`, `https://www.data.go.kr/catalog/${id}/openapi.json`]) {
    try {
      const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0' } });
      const t = await r.text();
      if (!r.ok) { console.log(u, r.status); continue; }
      let j; try { j = JSON.parse(t); } catch { console.log(u, 'not json', t.slice(0, 200)); continue; }
      console.log('=====', u);
      console.log(JSON.stringify({ name: j.name, desc: (j.description || '').slice(0, 400), kw: j.keywords, dist: j.distribution, cols: j.variableMeasured }, null, 0).slice(0, 2500));
    } catch (e) { console.log(u, String(e)); }
  }
}
// 1791710734
