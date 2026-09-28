import socket
import json
import sys

def run_blender_code(code: str, host: str = '127.0.0.1', port: int = 9876):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect((host, port))
    payload = json.dumps({'type': 'execute_code', 'params': {'code': code}}).encode('utf-8')
    s.sendall(payload)
    
    data = b''
    while True:
        chunk = s.recv(16384)
        if not chunk:
            break
        data += chunk
        try:
            res = json.loads(data.decode('utf-8'))
            s.close()
            return res
        except Exception:
            pass
    s.close()
    return None

if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == '-c':
        code = sys.argv[2]
    elif len(sys.argv) > 1 and sys.argv[1] != '-c':
        with open(sys.argv[1], 'r', encoding='utf-8') as f:
            code = f.read()
    else:
        code = sys.stdin.read()
    res = run_blender_code(code)
    if res:
        if res.get('status') == 'success':
            print(res.get('result', {}).get('result', ''))
        else:
            print("ERROR:", res.get('message', 'Unknown error'))
    else:
        print("NO RESPONSE FROM BLENDER MCP")
