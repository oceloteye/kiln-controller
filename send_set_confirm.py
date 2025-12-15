import websocket, json, sys

try:
    ws = websocket.create_connection('ws://127.0.0.1:8081/config', timeout=5)
    msg = {"cmd":"SET","data":{"kwh_rate":0.55,"kw_elements":8.5,"currency_type":"€"}}
    print('SENDING:', msg)
    ws.send(json.dumps(msg))
    resp = ws.recv()
    print('RESPONSE:', resp)
    ws.close()
except Exception as e:
    print('ERROR:', e)
    sys.exit(1)
