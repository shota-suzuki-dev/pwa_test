# セットアップ手順

所要 30〜40分。順番どおりに進めれば、iPhone に通知が届くところまで到達する。

```
.
├ index.html              PWA本体（登録・購読・購読JSONの表示）
├ sw.js                   Service Worker（push受信・通知タップ）
├ manifest.webmanifest    ホーム画面に追加するための情報
├ icon-192.png / icon-512.png / apple-touch-icon.png
├ tools/send.js           通知の送信スクリプト
└ .github/workflows/notify.yml
```

---

## 1. リポジトリを作って push する

**公開リポジトリにすること。** GitHub Actions が無料枠で回せる。
このリポジトリに秘密情報は置かない（VAPID 秘密鍵と購読情報は Secrets に入れる）。

---

## 2. GitHub Pages を有効にする

`Settings → Pages → Source: Deploy from a branch → main / (root) → Save`

**デプロイに GitHub Actions は不要。** ブランチ配信で十分。
Actions は通知の送信にしか使わない。ここを混同しないこと。

1〜2分後に `https://<ユーザー名>.github.io/<リポジトリ名>/` で開ける。

### 詰まりやすい点：パスは必ず相対にする

プロジェクトページはサブディレクトリ配信になる。

```
✗ navigator.serviceWorker.register('/sw.js')     ルート = user.github.io を指してしまう
○ navigator.serviceWorker.register('./sw.js')
```

manifest の `start_url` / `scope` も `"./"` にしてある。ここを絶対パスにすると
Service Worker のスコープ外になり、動かない。

---

## 3. VAPID 鍵を作る

手元（Windows でよい）で一度だけ実行する。

```bash
npx web-push generate-vapid-keys
```

```
Public Key:  BDx...      → index.html の VAPID_PUBLIC に貼る（公開してよい）
Private Key: k9F...      → GitHub Secrets に入れる（絶対にコミットしない）
```

`index.html` の `VAPID_PUBLIC` を書き換えて push する。

---

## 4. iPhone でホーム画面に追加する

**Safari で開くこと。** Chrome など他のブラウザでは追加できない。

1. Safari で公開 URL を開く
2. 共有ボタン →「ホーム画面に追加」
3. **ホーム画面のアイコンから開き直す**

画面上部の「1. ホーム画面に追加」が緑色になれば成功。
ここが灰色のままだと、次の手順で通知の許可が取れない。

---

## 5. 通知を許可して、購読情報をコピーする

1. 「通知を有効にする」をタップ → 許可
2. 「4. 購読情報をコピー」に JSON が出る → コピー
3. 「ローカル通知を出す」で通知の見た目とタップ後の遷移を確認する

ここまではサーバー不要。**サーバーに触る前に、体験の確認が完了する。**

---

## 6. Secrets を登録する

`Settings → Secrets and variables → Actions → New repository secret`

| 名前 | 中身 |
|---|---|
| `VAPID_PUBLIC` | 公開鍵 |
| `VAPID_PRIVATE` | 秘密鍵 |
| `VAPID_SUBJECT` | `mailto:自分のメールアドレス` |
| `PUSH_SUBSCRIPTION` | 手順5でコピーした JSON まるごと |

---

## 7. 送信を試す

`Actions → notify → Run workflow`

手動実行では、確率と時間帯の判定を飛ばして必ず送信される。
数秒〜数十秒で iPhone に通知が届く。

届かないときは Actions のログを見る。

| 症状 | 原因 |
|---|---|
| `410` / `404` | 購読が失効した。再購読して `PUSH_SUBSCRIPTION` を貼り直す |
| `403` | VAPID 鍵の不一致。`index.html` の公開鍵と Secrets を確認 |
| ログは成功だが届かない | ホーム画面のアイコンから開いていない／集中モード |

---

## 8. 自動送信について知っておくこと

- **cron は UTC**。JST への変換は `send.js` で行っている
- **時刻は正確でない**。数分〜数十分遅れる。回想は不規則に来てよいので問題にしない
- **60日間リポジトリに動きがないと、スケジュール実行が自動的に停止する**
  これは黙って止まるので要注意。定期的にコミットするか、停止に気づける仕組みを持つ
- 頻度は `send.js` の `RATE`（既定 0.2 = 毎時20%）で調整する

---

## 9. ここから先

この時点で「通知が来る／タップすると開く／購読できる」が揃っている。
アプリの中身（一文の登録、IndexedDB、温度、回想ログ）は `CLAUDE.md` の仕様に従って実装する。

`sw.js` の `push` ハンドラにある TODO を、IndexedDB から一文を選ぶ処理に差し替えれば、
通知に一文が出るようになる。**Service Worker は IndexedDB を読める。**
