/**
 * Listening through the microphone or a line input (an electric violin through an audio interface): the raw signal,
 * with the browser's voice processing switched off (echo cancellation, noise suppression and automatic gain spoil an
 * instrument's tone), read one window at a time for pitch detection (pitch.ts).
 */
import { audio } from "../engine/player.ts";
import { detectPitch, rms, type Pitch } from "./pitch.ts";

export interface Listening {
  /** one detection per animation frame: the pitch (or null) and the input level 0–1 */
  stop(): void;
  deviceLabel: string;
}

export async function inputDevices(): Promise<MediaDeviceInfo[]> {
  try {
    return (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audioinput");
  } catch {
    return [];
  }
}

export async function listen(onFrame: (p: Pitch | null, level: number) => void, deviceId?: string, window = 4096): Promise<Listening> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });
  const { ac } = audio();
  await ac.resume();
  const src = ac.createMediaStreamSource(stream);
  const an = ac.createAnalyser();
  an.fftSize = window;
  src.connect(an);
  const buf = new Float32Array(an.fftSize);
  let raf = 0;
  const frame = () => {
    an.getFloatTimeDomainData(buf);
    onFrame(detectPitch(buf, ac.sampleRate, { minHz: 27, maxHz: 4200, gate: 0.008 }), Math.min(1, rms(buf) * 4));
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return {
    deviceLabel: stream.getAudioTracks()[0]?.label ?? "",
    stop() {
      cancelAnimationFrame(raf);
      src.disconnect();
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}
