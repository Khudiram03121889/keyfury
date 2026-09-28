import socket
import json
import sys

def run_code_in_blender(code_str, timeout=120):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect(('127.0.0.1', 9876))
    payload = json.dumps({'type': 'execute_code', 'params': {'code': code_str}})
    s.sendall(payload.encode('utf-8'))
    s.settimeout(timeout)
    data = b''
    while True:
        chunk = s.recv(8192)
        if not chunk:
            break
        data += chunk
        try:
            res = json.loads(data.decode('utf-8'))
            s.close()
            return res
        except json.JSONDecodeError:
            continue
    s.close()
    return None

if __name__ == '__main__':
    if len(sys.argv) > 1:
        filepath = sys.argv[1]
        with open(filepath, 'r', encoding='utf-8-sig') as f:
            c = f.read()
        res = run_code_in_blender(c)
        print('Result:', res)
