"""
Orchestration script to execute the 3D Arena generation in Blender via Blender MCP (port 9876).
"""

import socket
import json
import sys
import time
import os

HOST = '127.0.0.1'
PORT = 9876
SCRIPT_PATH = r"d:\Keyboard stickman warrior\test_3d\blender_script.py"

def run():
    print(f"Connecting to Blender MCP at {HOST}:{PORT}...")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect((HOST, PORT))
    except Exception as e:
        print(f"ERROR: Could not connect to Blender MCP on {HOST}:{PORT}: {e}")
        sys.exit(1)

    print("Connected successfully!")
    
    # Python code wrapper to run the external script in Blender's environment
    escaped_script = SCRIPT_PATH.replace('\\', '\\\\')
    code = f"with open('{escaped_script}', 'r', encoding='utf-8') as f: exec(f.read())"
    
    command = {
        "type": "execute_code",
        "params": {
            "code": code
        }
    }
    
    print("Sending generation command to Blender MCP...")
    cmd_bytes = json.dumps(command).encode('utf-8')
    sock.sendall(cmd_bytes)
    
    # Wait for execution and response (rendering may take a few seconds)
    sock.settimeout(180.0)
    data = b''
    start_time = time.time()
    
    print("Waiting for Blender to build 3D arena, materials, fighters, and render output...")
    while True:
        try:
            chunk = sock.recv(8192)
            if not chunk:
                break
            data += chunk
            try:
                parsed = json.loads(data.decode('utf-8'))
                elapsed = time.time() - start_time
                print(f"Blender completed execution in {elapsed:.2f}s!")
                status = parsed.get("status")
                print(f"Status: {status}")
                if status == "success":
                    exec_output = parsed.get("result", {}).get("result", "")
                    print("Blender output:\n" + "-"*50 + "\n" + exec_output + "\n" + "-"*50)
                else:
                    print("Error message:", parsed.get("message"))
                break
            except json.JSONDecodeError:
                continue
        except socket.timeout:
            print("ERROR: Socket timed out waiting for Blender response.")
            break
        except Exception as e:
            print(f"ERROR during socket communication: {e}")
            break

    sock.close()

if __name__ == "__main__":
    run()
