// GitHub Actions から実行される送信スクリプト。
// 送るのは「合図」だけ。通知の本文は端末側の Service Worker が組み立てる。

const webpush = require('web-push');

const { VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT, PUSH_SUBSCRIPTION, FORCE } = process.env;

if (!VAPID_PUBLIC || !VAPID_PRIVATE || !PUSH_SUBSCRIPTION) {
  console.error('Secrets が足りません');
  process.exit(1);
}

// --- 静かな時間帯は送らない（JST 9:00〜22:00 のみ）
// GitHub Actions の cron は UTC なので、ここで JST に直して判定する
const jstHour = new Date(Date.now() + 9 * 3600 * 1000).getUTCHours();
if (!FORCE && (jstHour < 9 || jstHour >= 22)) {
  console.log(`quiet hours (JST ${jstHour}時) — 送信しません`);
  process.exit(0);
}

// --- 確率で送る
// 毎時起動しつつ確率で間引くことで、通知の時刻が不規則になる。
// 回想は予告なく来るほうが良いので、これで十分。忘却曲線の計算はしない。
const RATE = 0.2;
if (!FORCE && Math.random() > RATE) {
  console.log('今回は送信しません');
  process.exit(0);
}

webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:me@example.com', VAPID_PUBLIC, VAPID_PRIVATE);

webpush
  .sendNotification(JSON.parse(PUSH_SUBSCRIPTION), JSON.stringify({ ping: 1 }))
  .then(() => console.log('送信しました'))
  .catch(err => {
    console.error('失敗:', err.statusCode, err.body);
    // 410/404 は購読が無効になった合図。再購読して Secret を貼り直す必要がある
    process.exit(1);
  });
