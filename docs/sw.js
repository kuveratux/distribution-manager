// オフラインでも開けるように、アプリの枠を端末に保管する。
// 保管庫の名前は頭に dist-manager を付け、自分のものだけを消す（同じ kuveratux.github.io のほかのアプリのものは消さない）
const CACHE = 'dist-manager-shell-0.3.3';
const FILES = ['./', 'index.html', 'icon.svg', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, {cache: 'reload'})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('dist-manager-shell-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// つながるときは新しいものを取り、つながらないときは保管したものを出す
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // 画面を開く取り寄せ（navigate）には指定を足せないので、アドレスから取り直す
  const fresh = req.mode === 'navigate' ? fetch(req.url, {cache: 'no-cache'}) : fetch(req, {cache: 'no-cache'});
  e.respondWith(
    fresh
      .then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; })
      .catch(() => caches.match(req, {ignoreSearch: true}).then(r => r || caches.match('index.html')))
  );
});
