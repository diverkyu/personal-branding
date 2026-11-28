"""Verify the five reviewed upstream skill bundles without network access."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2] / '.agents/skills'
manifest = json.loads((root / 'upstream-lock.json').read_text(encoding='utf-8'))
actual = {}
for name in manifest['skills']:
    for file in (root / name).rglob('*'):
        if file.is_file():
            actual[file.relative_to(root).as_posix()] = hashlib.sha256(file.read_bytes().replace(b'\r\n', b'\n')).hexdigest()
if actual != manifest['files']:
    raise SystemExit('Skill files differ from reviewed commit; review upstream changes before updating the manifest.')
print(json.dumps({'status': 'verified', 'files': len(actual), 'commit': manifest['commit']}))
