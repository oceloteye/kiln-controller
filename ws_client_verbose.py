import asyncio, json, sys

try:
    import websockets
except Exception:
    sys.exit('websockets library not installed; run `pip install websockets`')

OUT = 'ws_client_output.txt'

async def main():
    uri = 'ws://127.0.0.1:8081/config'
    with open(OUT, 'w') as f:
        f.write(f'Connecting to {uri}\n')
    try:
        async with websockets.connect(uri) as ws:
            print('Connected')
            await ws.send('GET')
            msg = await ws.recv()
            print('RECV (GET):', msg)
            with open(OUT, 'a') as f:
                f.write('RECV (GET): ' + msg + '\n')

            payload = {'cmd':'SET', 'data': {'kwh_rate': 3.1415}}
            await ws.send(json.dumps(payload))
            msg2 = await ws.recv()
            print('RECV (after SET):', msg2)
            with open(OUT, 'a') as f:
                f.write('RECV (after SET): ' + msg2 + '\n')
    except Exception as e:
        print('ERROR', e)
        with open(OUT, 'a') as f:
            f.write('ERROR: ' + repr(e) + '\n')

if __name__ == '__main__':
    asyncio.run(main())
