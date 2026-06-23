# 台風 進路・速度ウォッチャー

気象庁の台風予報を**1時間刻みに補間して表示**し、**過去（約3時間前）の予報と比較して加速/減速を判定**するツール。

## なぜ作ったか
ニュースの台風図は取得時刻ごとに暴風域サークルの時刻表示がズレていき、「当初予報より速くなった/遅くなった」が読み取りにくい。
気象庁の予報点は **0/24/48/72/96/120時間先** の飛び飛びでしか出ないため、本ツールは大圏線で**1時間刻みに補間**し、さらに**過去の予報を自前で蓄積**して速度変化を可視化する。

## 構成
- `index.html` … 画面本体（Leaflet + 地理院タイル、単一ファイル）。気象庁JSONを直接取得して描画。
- `collect.mjs` … 収集スクリプト。気象庁JSONを取得し `data/{TC}/{発表時刻}.json` に蓄積（重複発表はスキップ、72時間で自動削除）。
- `.github/workflows/collect.yml` … GitHub Actions。30分ごとに `collect.mjs` を実行しコミット。**自分のPCは不要**。

## データ源（すべて気象庁の公開JSON）
- `https://www.jma.go.jp/bosai/typhoon/data/targetTc.json` … 活動中の台風一覧
- `.../TC{id}/forecast.json` … 進路・予報円・暴風警戒域・強風域
- `.../TC{id}/specifications.json` … 中心気圧・最大風速・最大瞬間風速・階級

CORS開放済み（`Access-Control-Allow-Origin: *`）のためブラウザから直接取得できる。

## セットアップ
1. このリポジトリを公開（Public）で作成・push（Actions が公開リポジトリなら無料・無制限）。
2. **Settings → Pages → Source: Deploy from a branch / main / (root)** を有効化。
3. **Settings → Actions → General → Workflow permissions: Read and write** を許可。
4. Actions タブで `collect-typhoon` を一度 **Run workflow**（手動）。以降30分ごとに自動収集。
5. `https://{ユーザー名}.github.io/{リポジトリ名}/` を開く。

## 動作の仕組み（速度比較）
- 画面は常に**気象庁から最新を直接取得**して進路・強度を描画。
- 比較は `data/` に蓄積された過去スナップショットを読み、
  「3時間前の予報が*今ごろ*予想していた位置」と「実際の現在位置」を比べ、
  進行方向に**先行＝予想より速い / 遅れ＝予想より遅い**を判定する。
- ローカルで `index.html` を直接開いた場合は localStorage に蓄積（タブを開いている間のみ）。
  GitHub Pages 版は `data/` 蓄積を読むため、**いつ開いても過去比較が有効**。
