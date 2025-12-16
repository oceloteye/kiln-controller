# Async unit test for /config websocket endpoint
# Usage: pip install -r requirements.txt
# Run: python -m pytest Test/test_config_ws.py

import asyncio
import json
import os
import pytest
import websockets

SERVER = os.environ.get('KILN_SERVER', 'ws://127.0.0.1:8081/config')


@pytest.mark.asyncio
async def test_config_set_and_echo():
    """Connect to /config, send SET and expect echoed config containing our values."""
    async with websockets.connect(SERVER) as ws:
        # Request current config first
        await ws.send('GET')
        resp = await ws.recv()
        # parse to ensure server responds
        cfg = json.loads(resp)
        assert isinstance(cfg, dict)

        # Send SET command
        msg = { 'cmd': 'SET', 'data': { 'kwh_rate': 0.99, 'kw_elements': 1.23, 'currency_type': '€' } }
        await ws.send(json.dumps(msg))

        # Wait for server echo/config response
        resp2 = await ws.recv()
        cfg2 = json.loads(resp2)

        # Validate the server applied or echoed at least the keys we set
        assert float(cfg2.get('kwh_rate')) == pytest.approx(0.99, rel=1e-6)
        assert float(cfg2.get('kw_elements')) == pytest.approx(1.23, rel=1e-6)
        assert str(cfg2.get('currency_type')) == '€'

        # Optionally: restore previous kwh_rate if original cfg had one
        try:
            restore_msg = { 'cmd': 'SET', 'data': { 'kwh_rate': cfg.get('kwh_rate', 0.26), 'kw_elements': cfg.get('kw_elements', 9.46), 'currency_type': cfg.get('currency_type', '$') } }
            await ws.send(json.dumps(restore_msg))
            await ws.recv()
        except Exception:
            pass
