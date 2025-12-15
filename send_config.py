import websocket, json
try:
    ws = websocket.create_connection("ws://localhost:8081/config")
    msg = {"cmd":"SET","data":{"kwh_rate":0.42,"kw_elements":9.46,"currency_type":"$"}}
    print('SENDING:', msg)
    ws.send(json.dumps(msg))
    resp = ws.recv()
    print('RESPONSE:', resp)
    ws.close()
except Exception as e:
    print('ERROR:', e)
