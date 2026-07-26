// Service Worker
// ページとは別に動く常駐スクリプト。ページを閉じても、アプリを開いていなくても生きている。
// DOM には触れない。window も document も存在しない。

const VERSION = 'v1';

// ライフサイクル：install → activate
// skipWaiting / clients.claim を入れておくと、更新が即座に反映される
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));


// --- push を受け取る
// 重要：iOS では push を受けたら必ず通知を1件表示すること。
// 表示しないと（サイレントpush）通知の権限を失う。
self.addEventListener('push', event => {
  event.waitUntil((async () => {

    // サーバーから来るのは「合図」だけ。本文はここで組み立てる。
    // → 一文がサーバーに送られない。サーバー側に DB が要らない。
    //
    // TODO: ここで IndexedDB から一文を1件選ぶ処理に差し替える。
    //       Service Worker は IndexedDB を読める。
    let body = '読んだ一文が、ここに出ます。';
    let id = '';

    try {
      if (event.data) {
        const d = event.data.json();
        if (d.body) body = d.body;
      }
    } catch (_) { /* payload が無くても必ず表示する */ }

    await self.registration.showNotification('覚えていますか', {
      body,
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: 'kaisou',        // 同じ tag は上書きされ、通知が溜まらない
      data: { url: './?id=' + id }
    });
  })());
});


// --- 通知をタップしたとき
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './';

  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // 既に開いていれば、そのウィンドウを使う
    for (const c of list) {
      if ('focus' in c) {
        await c.focus();
        if ('navigate' in c) { try { await c.navigate(url); } catch (_) {} }
        return;
      }
    }
    // 開いていなければ新しく開く
    await self.clients.openWindow(url);
  })());
});
