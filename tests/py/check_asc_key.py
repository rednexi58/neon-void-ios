"""Exit 0 if resolve_private_key handles every key shape CI may provide; exit 3 if crypto packages are missing."""
import base64, os, sys, tempfile
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'scripts'))
try:
    import jwt
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ec
except ImportError:
    sys.exit(3)
import asc_store_sync as s

key = ec.generate_private_key(ec.SECP256R1())
pem = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode()
with tempfile.NamedTemporaryFile('w', delete=False, suffix='.p8') as f:
    f.write(pem)
os.environ['GK_TEST_KEY'] = pem
cases = {
    'pem': pem, 'escaped newlines': pem.replace('\n', '\\n'), 'one line with spaces': pem.replace('\n', ' '),
    'one line': pem.replace('\n', ''), '@file': '@file:' + f.name, 'bare path': f.name, '@env': '@env:GK_TEST_KEY',
    'base64 pem': base64.b64encode(pem.encode()).decode(), 'raw body': ''.join(pem.strip().splitlines()[1:-1]),
}
failed = []
for name, value in cases.items():
    try:
        jwt.encode({'t': 1}, s.resolve_private_key(value), algorithm='ES256')
    except Exception as e:  # noqa: BLE001 - report every failing shape
        failed.append(f'{name}: {e}')
os.unlink(f.name)
if failed:
    print('\n'.join(failed))
    sys.exit(1)
print('all key shapes ok')
