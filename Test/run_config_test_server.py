import os
import sys
import json
import threading
import subprocess

import asyncio
import websockets


config = { 'kwh_rate': 0.26, 'kw_elements': 9.46, 'currency_type': '$' }

async def handler(ws, path):
    try:
        async for msg in ws:
            if msg == 'GET':
                await ws.send(json.dumps(config))
            else:
                try:
                    data = json.loads(msg)
                    if data.get('cmd') == 'SET':
                        config.update(data.get('data', {}))
                        await ws.send(json.dumps(config))
                except Exception:
                    pass
    except Exception:
        pass


def start_server():
    asyncio.set_event_loop(asyncio.new_event_loop())
    loop = asyncio.get_event_loop()
    server = websockets.serve(handler, '127.0.0.1', 8081)
    loop.run_until_complete(server)
    loop.run_forever()


if __name__ == '__main__':
    t = threading.Thread(target=start_server, daemon=True)
    t.start()

    os.environ['KILN_SERVER'] = 'ws://127.0.0.1:8081/config'

    # Run pytest against the test file
    code = subprocess.run([sys.executable, '-m', 'pytest', '-q', 'Test/test_config_ws.py'])
    sys.exit(code.returncode)
import os
import sys
import json
import threading
import subprocess

import asyncio
import websockets


config = { 'kwh_rate': 0.26, 'kw_elements': 9.46, 'currency_type': '$' }

async def handler(ws, path):
    try:
        async for msg in ws:
            if msg == 'GET':
                await ws.send(json.dumps(config))
            else:
                try:
                    data = json.loads(msg)
                    if data.get('cmd') == 'SET':
                        config.update(data.get('data', {}))
                        await ws.send(json.dumps(config))
                except Exception:
                    pass
    except Exception:
        pass


def start_server():
    asyncio.set_event_loop(asyncio.new_event_loop())
    loop = asyncio.get_event_loop()
    server = websockets.serve(handler, '127.0.0.1', 8081)
    loop.run_until_complete(server)
    loop.run_forever()


if __name__ == '__main__':
    t = threading.Thread(target=start_server, daemon=True)
    t.start()

    os.environ['KILN_SERVER'] = 'ws://127.0.0.1:8081/config'

    # Run pytest against the test file
    code = subprocess.run([sys.executable, '-m', 'pytest', '-q', 'Test/test_config_ws.py'])
    sys.exit(code.returncode)
