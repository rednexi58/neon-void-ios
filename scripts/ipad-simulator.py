"""Capture actual simulator UI. Never modifies the App Store IPA or game saves."""
import json
import pathlib
import subprocess
import time

OUT = pathlib.Path('build/ipad-review')
APP = pathlib.Path('build/simulator/Build/Products/Debug-iphonesimulator/App.app')
OUT.mkdir(parents=True, exist_ok=True)

def run(*args, timeout=180):
    return subprocess.check_output(args, text=True, timeout=timeout).strip()

sdk = run('xcrun', '--sdk', 'iphonesimulator', '--show-sdk-version')
runtimes = json.loads(run('xcrun', 'simctl', 'list', 'runtimes', '--json'))['runtimes']
runtime = next((r for r in runtimes if r.get('isAvailable') and r.get('version') == sdk and 'iOS' in r['name']), None)
if not runtime:
    raise SystemExit(f'No installed runtime matching SDK {sdk}.')
types = json.loads(run('xcrun', 'simctl', 'list', 'devicetypes', '--json'))['devicetypes']

def create_device(kind):
    if kind == 'ipad':
        candidates = [d for d in types if 'iPad Pro' in d['name'] and ('13-inch' in d['name'] or '12.9-inch' in d['name'])]
        candidates.sort(key=lambda d: ('13-inch' not in d['name'], 'M4' not in d['name'], '6th generation' not in d['name']))
    else:
        preferred = ['iPhone 16 Pro', 'iPhone 15 Pro', 'iPhone 17 Pro', 'iPhone 16', 'iPhone 15']
        candidates = [d for name in preferred for d in types if d['name'] == name]
    # simctl output order is not chronological: last used to select original iPad Pro.
    for device in candidates:
        try:
            udid = run('xcrun', 'simctl', 'create', f'Gezegeni Koru {kind} Review', device['identifier'], runtime['identifier'])
            return device, udid
        except subprocess.CalledProcessError:
            print('Runtime does not support:', device['name'], flush=True)
    raise RuntimeError(f'No compatible {kind} available for {sdk}.')

# Only the unsigned simulator .app receives a UI navigation driver. No mock store,
# altered prices, extra currency, unlocks, or bypassed native permissions.
page = APP / 'public/index.html'
original = page.read_text()
driver = r'''
<script>
(() => {
  const click = id => {
    const el = document.getElementById(id);
    if (el && el.getClientRects().length && !el.disabled) el.click();
  };
  // Wait for the app's load handler before navigating. Its initial startLevel
  // would otherwise close a modal opened while fonts/assets were still loading.
  const begin = () => {
    const ensureShop = () => {
      const shop = document.getElementById('modalShop');
      if (shop && shop.classList.contains('hidden')) click('btnLobbyOpenShop');
    };
    setTimeout(ensureShop, 5000);
    const retry = setInterval(ensureShop, 3000);
    setTimeout(() => clearInterval(retry), 90000);
    setTimeout(() => {
      const el = document.querySelector('[data-gem-pack="gems_10000"]');
      if (el && el.getClientRects().length) el.scrollIntoView({block:'end'});
    }, 95000);
  };
  if (document.readyState === 'complete') begin();
  else window.addEventListener('load', begin, {once:true});
})();
</script>
'''
page.write_text(original.replace('</body>', driver + '</body>'))
try:
    for kind in ['ipad', 'iphone']:
        device, udid = create_device(kind)
        print('Selected:', kind, device['name'], runtime['name'], flush=True)
        (OUT / f'{kind}-device.json').write_text(json.dumps({'device':device['name'],'runtime':runtime['name'],'udid':udid}, indent=2))
        try:
            run('xcrun', 'simctl', 'boot', udid)
            run('xcrun', 'simctl', 'bootstatus', udid, '-b', timeout=240)
            run('xcrun', 'simctl', 'install', udid, str(APP))
            run('xcrun', 'simctl', 'status_bar', udid, 'override', '--time', '9:41', '--batteryState', 'charged', '--batteryLevel', '100')
            run('xcrun', 'simctl', 'launch', udid, 'com.neonvoid.cyberdefense')
            start = time.monotonic()
            for seconds, screen in [(80,'shop-top'),(135,'shop-bottom')]:
                time.sleep(max(0, start + seconds - time.monotonic()))
                run('xcrun', 'simctl', 'io', udid, 'screenshot', str(OUT / f'{kind}-{screen}.png'))
        finally:
            run('xcrun', 'simctl', 'shutdown', udid)
finally:
    page.write_text(original)
(OUT / 'OKU.txt').write_text('Gerçek simülatör ekranları: yüklemeden önce görsel olarak inceleyin. İzin ekranı görüntüyü kapatabilir. Fiyatlar Apple bağlantısına bağlıdır. Gerçek satın alma teslimatını TestFlight üzerinde doğrulayın. Simulator uygulamasındaki geçici gezinme kodu çıktı alınırken kaldırıldı; yayın IPA dosyasına dokunulmadı.\n')
print('Screenshots captured. Visual review still required.', flush=True)
