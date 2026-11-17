"""Finish the runner's sound-to-score engines (pixi run -e audio audio-setup).

The audio environment (pixi.toml) already has Transkun, with its weights, and what Basic Pitch needs. Basic Pitch
itself is installed here without its dependencies: its package asks for TensorFlow below 2.15.1, which has no wheels
for this Python, but it ships its model as ONNX too, which onnxruntime runs. Then both are loaded once, to be sure.
"""

import os
import subprocess
import sys
import sysconfig

BASIC_PITCH = "basic-pitch==0.4.0"


def main():
    user = [] if os.access(sysconfig.get_paths()["purelib"], os.W_OK) else ["--user"]
    print(f"$ pip install --no-deps {BASIC_PITCH}")
    subprocess.run([sys.executable, "-m", "pip", "install", "--quiet", "--no-deps", *user, BASIC_PITCH], check=True)

    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import audio

    print("engines:", ", ".join(audio.engines()) or "none")
    print("device: ", audio.device())
    if not audio.engines():
        raise SystemExit("neither engine loads: see the messages above")
    print("ready; start the runner with: pixi run runner")


if __name__ == "__main__":
    main()
