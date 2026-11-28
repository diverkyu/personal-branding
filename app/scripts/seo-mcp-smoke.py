"""Read project MCP configuration; verify stdio protocol without credentials or AI calls."""
import json
import os
from pathlib import Path
import queue
import subprocess
import sys
import threading
import time
import tomllib
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
CONFIG = tomllib.loads((ROOT / '.codex/config.toml').read_text(encoding='utf-8'))


def verify(name, config):
    process = subprocess.Popen(
        [config['command'], *config['args']], cwd=ROOT, stdin=subprocess.PIPE,
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, encoding='utf-8',
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0,
    )
    responses = queue.Queue()

    def read():
        for line in process.stdout:
            try:
                responses.put(json.loads(line))
            except json.JSONDecodeError:
                # Package startup notices are not protocol responses.
                continue

    threading.Thread(target=read, daemon=True).start()
    next_id = 0

    def request(method, params):
        nonlocal next_id
        next_id += 1
        process.stdin.write(json.dumps({'jsonrpc': '2.0', 'id': next_id, 'method': method, 'params': params}) + '\n')
        process.stdin.flush()
        deadline = time.monotonic() + 90
        while True:
            response = responses.get(timeout=max(0.01, deadline - time.monotonic()))
            if response.get('id') != next_id:
                continue
            if 'error' in response:
                raise RuntimeError(f'{name}: protocol error {response["error"].get("code")}')
            return response['result']

    try:
        init = request('initialize', {'protocolVersion': '2024-11-05', 'capabilities': {}, 'clientInfo': {'name': 'diverkyu-connection-check', 'version': '1.0'}})
        process.stdin.write(json.dumps({'jsonrpc': '2.0', 'method': 'notifications/initialized'}) + '\n')
        process.stdin.flush()
        available = request('tools/list', {})['tools']
        result = {'name': name, 'server': init.get('serverInfo'), 'protocol': init.get('protocolVersion'), 'toolCount': len(available), 'status': 'connected'}
        if '--list' in sys.argv:
            result['navigationTools'] = [{k: t.get(k) for k in ('name', 'inputSchema')} for t in available if t['name'] in ('new_page', 'evaluate_script', 'close_page')]
        if '--probe' in sys.argv:
            origin = os.environ.get('SITE_URL', '')
            parsed = urlparse(origin)
            if parsed.scheme != 'https' or parsed.hostname != 'www.diverkyu.com' or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in ('', '/'):
                raise RuntimeError('Probe requires the approved public SITE_URL origin')
            if name != 'chrome_devtools_seo':
                raise RuntimeError('Only the approved Chrome server is probed')
            opened = request('tools/call', {'name': 'new_page', 'arguments': {'url': origin, 'background': True, 'timeout': 20000}})
            if opened.get('isError'):
                raise RuntimeError('Public page probe failed')
            result['publicPageProbe'] = opened
        print(json.dumps(result, ensure_ascii=False))
    finally:
        process.stdin.close()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            # Only the exact process tree this test started; never other Chrome sessions.
            if os.name == 'nt':
                subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'], capture_output=True, check=False)
            else:
                process.terminate()
            process.wait(timeout=10)


if __name__ == '__main__':
    for server in ('chrome_devtools_seo', 'playwright_seo'):
        settings = CONFIG['mcp_servers'][server]
        if settings.get('enabled', True):
            verify(server, settings)
        else:
            print(json.dumps({'name': server, 'status': 'disabled_by_user'}))
