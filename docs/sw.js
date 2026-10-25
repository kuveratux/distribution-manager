// オフラインでも開けるように、アプリの枠を端末に保管する（EV・ESV と同じ作り）。
// - 画面のファイルは保管庫を優先して返す。出ている画面は、いつも今の Service Worker と同じ版になる
//   （画面だけ先に新しくなると、あとで Service Worker が入れ替わったときに「新しいバージョンがあります」が出てしまうため）
// - 新しい版のファイルは、入れ替わるとき（install）に、公開サイトの一時保管（最大 10 分）を通さずに取る
// 保管庫の名前は頭に dist-manager を付け、自分のものだけを消す（同じ kuveratux.github.io のほかのアプリのものは消さない）
const CACHE = 'dist-manager-shell-0.9.11';
const FILES = ['./', 'index.html', 'icon.svg', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'qrcode.js', 'jsqr.js'];

// URL に版の印を付けて取り、印のない名前で保管する
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(FILES.map(f => fetch(new Request(f + '?v=0.9.11', {cache: 'reload'}))
      .then(res => { if (!res.ok) throw new Error(f + ': ' + res.status); return c.put(new Request(f), res); }))))
    .then(() => self.skipWaiting()));
});

// 画面から「入れ替えて」と言われたら、待たずに入れ替わる（EV と同じ）
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('dist-manager-shell-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// 保管庫を優先する。画面を開く取り寄せ（navigate）は保管したものだけを出し、裏で取り直さない（版を混ぜない）
// ほかのファイルは裏で取り直す。更新の確認（no-store・reload）は保管庫を通さない
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.cache === 'no-store' || req.cache === 'reload') return;
  e.respondWith(caches.open(CACHE).then(c => c.match(req, {ignoreSearch: true}).then(hit => {
    if (req.mode === 'navigate') return hit || c.match('index.html').then(x => x || fetch(req));
    const update = fetch(req, {cache: 'no-cache'})
      .then(res => { if (res.ok) c.put(req, res.clone()); return res; })
      .catch(() => hit);
    return hit || update;
  })));
});
