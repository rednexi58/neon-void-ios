"""Run only on the Codemagic Mac. Capture the real first screen for review."""
import json
import pathlib
import subprocess
import time

OUT = pathlib.Path('build/ipad-review')
OUT.mkdir(parents=True, exist_ok=True)

def run(*args, timeout=180):
    return subprocess.check_output(args, text=True, timeout=timeout).strip()

sdk = run('xcrun', '--sdk', 'iphonesimulator', '--show-sdk-version')
runtimes = json.loads(run('xcrun', 'simctl', 'list', 'runtimes', '--json'))['runtimes']
runtime = next((r for r in runtimes if r.get('isAvailable') and r.get('version') == sdk and 'iOS' in r['name']), None)
if not runtime:
    raise SystemExit(f'No available iOS runtime matching SDK {sdk}. Check Xcode/runtime on the builder.')
types = json.loads(run('xcrun', 'simctl', 'list', 'devicetypes', '--json'))['devicetypes']
tablets = [d for d in types if 'iPad Pro' in d['name'] and ('13-inch' in d['name'] or '12.9-inch' in d['name'])]
if not tablets:
    raise SystemExit('No 13-inch/12.9-inch iPad Pro simulator device type installed.')
device = tablets[-1]
udid = run('xcrun', 'simctl', 'create', 'Gezegeni Koru iPad Review', device['identifier'], runtime['identifier'])
(OUT / 'device.json').write_text(json.dumps({'device':device['name'],'runtime':runtime['name'],'udid':udid}, indent=2))
run('xcrun', 'simctl', 'boot', udid)
run('xcrun', 'simctl', 'bootstatus', udid, '-b', timeout=240)
app = 'build/simulator/Build/Products/Debug-iphonesimulator/App.app'
run('xcrun', 'simctl', 'install', udid, app)
run('xcrun', 'simctl', 'status_bar', udid, 'override', '--time', '9:41', '--batteryState', 'charged', '--batteryLevel', '100')
run('xcrun', 'simctl', 'launch', udid, 'com.neonvoid.cyberdefense')
# Startup permission dialogs can appear: the PNG must be visually reviewed.
time.sleep(12)
run('xcrun', 'simctl', 'io', udid, 'screenshot', str(OUT / 'ipad-first-screen.png'))
(OUT / 'OKU.txt').write_text('Bu yalnızca gerçek simülatör başlangıç ekranıdır. İzin ekranı çıkabilir. Oynanış, evrim ve mağaza ayrıca kontrol edilmeli. VNC ile simülatöre bağlanıp ekranları açabilirsiniz. Satın alma teslimatı TestFlight üzerinde ayrıca denenmeli.\n')
print(f'iPad simulator running: {udid}. Review build/ipad-review. Not a complete device test.')
