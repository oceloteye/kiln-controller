import asyncio, json

try:
    import websockets
except Exception:
    raise SystemExit('websockets library not found; run `pip install websockets`')

async def main():
    uri = 'ws://127.0.0.1:8081/config'
    print('Connecting to', uri)
    try:
        async with websockets.connect(uri) as ws:
            print('Connected')
            await ws.send('GET')
            msg = await ws.recv()
            print('RECV (GET):', msg)

            # send a SET to change kwh_rate (string or number accepted)
            payload = {'cmd':'SET', 'data': {'kwh_rate': 3.14}}
            await ws.send(json.dumps(payload))
            msg2 = await ws.recv()
            print('RECV (after SET):', msg2)
    except Exception as e:
        print('ERROR:', repr(e))

if __name__ == '__main__':
    asyncio.run(main())
