// 気象庁の台風JSONを取得して data/ にスナップショット蓄積する収集スクリプト。
// GitHub Actions(30分ごと)から実行。発表時刻(issue)が同じものは重複保存しない。
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://www.jma.go.jp/bosai/typhoon/data/';
const KEEP_MS = 72 * 3600 * 1000;      // 72時間より古いスナップショットは削除
const DATA = 'data';

async function j(u){
  const r = await fetch(u, { headers: { 'User-Agent': 'typhoon-watch-collector' } });
  if(!r.ok) throw new Error(r.status + ' ' + u);
  return r.json();
}
// "2026-06-23T06:45:00Z" -> "20260623T064500Z"
const safeName = iso => iso.replace(/[-:]/g, '').replace(/\.\d+/, '');

fs.mkdirSync(DATA, { recursive: true });

const list = await j(BASE + 'targetTc.json');
fs.writeFileSync(path.join(DATA, 'active.json'),
  JSON.stringify({ updated: new Date().toISOString(), list }));

if(!list.length){ console.log('発生中の台風なし'); process.exit(0); }

for(const t of list){
  const tc = t.tropicalCyclone;
  const dir = path.join(DATA, tc);
  fs.mkdirSync(dir, { recursive: true });

  let fc, spec = null;
  try { fc = await j(`${BASE}${tc}/forecast.json`); }
  catch(e){ console.error('forecast取得失敗', tc, e.message); continue; }
  try { spec = await j(`${BASE}${tc}/specifications.json`); } catch(e){ /* 強度は任意 */ }

  const title = fc.find(r => r.part === 'title');
  const issue = (title && title.issue && title.issue.UTC) || new Date().toISOString();
  const file = safeName(issue) + '.json';
  const fp = path.join(dir, file);

  if(!fs.existsSync(fp)){
    fs.writeFileSync(fp, JSON.stringify({ tc, typhoonNumber: t.typhoonNumber, issue, forecast: fc, spec }));
    console.log('保存', tc, file);
  } else {
    console.log('既存(スキップ)', tc, file);
  }

  // index.json 再構築 ＋ 期限切れ削除
  const cut = Date.now() - KEEP_MS;
  let entries = fs.readdirSync(dir)
    .filter(f => f.endsWith('.json') && f !== 'index.json')
    .map(f => {
      let iso = null;
      try { iso = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).issue; } catch(e){}
      return { file: f, issue: iso };
    });
  for(const e of entries){
    if(e.issue && new Date(e.issue).getTime() < cut){
      fs.unlinkSync(path.join(dir, e.file)); e.remove = true;
    }
  }
  entries = entries.filter(e => !e.remove).sort((a, b) => new Date(a.issue) - new Date(b.issue));
  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify({
    tc, typhoonNumber: t.typhoonNumber, name: t.name || null,
    updated: new Date().toISOString(),
    snapshots: entries.map(e => e.file),
    issues: entries.map(e => e.issue)
  }));
  console.log('  index更新:', entries.length, '件');
}
console.log('完了');
