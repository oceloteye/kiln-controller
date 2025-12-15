import os
import json
import asyncio
import pytest
import websockets


@pytest.fixture(scope='module')
async def config_server():
    """Async websocket /config server for async tests."""
    config = {'kwh_rate': 0.26, 'kw_elements': 9.46, 'currency_type': '$'}

    async def handler(ws, path=None):
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

    server = await websockets.serve(handler, '127.0.0.1', 0)
    port = server.sockets[0].getsockname()[1]
    url = f'ws://127.0.0.1:{port}/config'
    prev = os.environ.get('KILN_SERVER')
    os.environ['KILN_SERVER'] = url

    try:
        yield url
    finally:
        if prev is None:
            del os.environ['KILN_SERVER']
        else:
            os.environ['KILN_SERVER'] = prev
        server.close()
        await server.wait_closed()


@pytest.fixture(scope='module')
def config_server_sync():
    """Synchronous websocket /config server for sync tests (Selenium).
    Starts an asyncio server in a background thread and yields ws:// URL."""
    import threading
    import queue

    cfg = {'kwh_rate': 0.26, 'kw_elements': 9.46, 'currency_type': '$'}

    async def handler(ws, path=None):
        try:
            async for msg in ws:
                if msg == 'GET':
                    await ws.send(json.dumps(cfg))
                else:
                    try:
                        data = json.loads(msg)
                        if data.get('cmd') == 'SET':
                            cfg.update(data.get('data', {}))
                            await ws.send(json.dumps(cfg))
                    except Exception:
                        pass
        except Exception:
            pass

    q = queue.Queue()

    def _runner():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        srv = loop.run_until_complete(websockets.serve(handler, '127.0.0.1', 0))
        port = srv.sockets[0].getsockname()[1]
        q.put((loop, srv, port))
        try:
            loop.run_forever()
        finally:
            try:
                srv.close()
                loop.run_until_complete(srv.wait_closed())
            finally:
                loop.close()

    thread = threading.Thread(target=_runner, daemon=True)
    thread.start()
    loop, srv, port = q.get(timeout=5)
    url = f'ws://127.0.0.1:{port}/config'
    prev = os.environ.get('KILN_SERVER')
    os.environ['KILN_SERVER'] = url

    try:
        yield url
    finally:
        if prev is None:
            del os.environ['KILN_SERVER']
        else:
            os.environ['KILN_SERVER'] = prev
        try:
            loop.call_soon_threadsafe(loop.stop)
        except Exception:
            pass

@pytest.fixture(scope='module')
def http_server():
    """Start a simple HTTP server serving the project's public directory on port 8000.
    Yields the base URL (e.g. http://127.0.0.1:8000) and stops the server after the module tests."""
    import threading
    from http.server import SimpleHTTPRequestHandler, HTTPServer
    import socket

    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    public_dir = os.path.join(repo_root, 'public')

    class _Handler(SimpleHTTPRequestHandler):
        def translate_path(self, path):
            if path == '/' or path.startswith('/index.html'):
                path = '/index.html'
            requested = os.path.normpath(public_dir + path)
            return requested

    server = HTTPServer(('127.0.0.1', 8000), _Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = 'http://127.0.0.1:8000'
    try:
        yield url
    finally:
        try:
            server.shutdown()
        except Exception:
            pass
        thread.join(timeout=1)