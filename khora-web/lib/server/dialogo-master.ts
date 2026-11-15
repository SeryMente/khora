import ffmpegPath from "ffmpeg-static";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { downmixStereoPcm16Safely, encodeStereoMasterWav } from "../dialogo/audio";
import type { AudioDialogo } from "../dialogo/transcribir";
const MAX_SOURCE_BYTES = 40_000_000;
const MAX_MASTER_BYTES = 256_000_000;
function runFfmpeg(args: string[]): Promise<void> {
  const executable = ffmpegPath;
  if (!executable) throw new Error("ffmpeg_no_disponible");
  return new Promise<void>((resolve, reject) => {
    execFile(executable, ["-hide_banner", "-nostdin", "-xerror", "-v", "error", ...args], {
      windowsHide: true, timeout: 90_000, maxBuffer: 2_000_000,
    }, (error, _stdout, stderr) => {
      if (error) reject(new Error("dialogo_decode_failed:" + String(stderr).slice(-1200)));
      else resolve();
    });
  });
}/** Decodes the separately retained originals, then aligns them into one stereo PCM WAV derivative. */
export async function generarMasterWavDialogo(tracks: AudioDialogo[]): Promise<Buffer> {
  const user = tracks.find((track) => track.fuente === "microphone");
  const chrome = tracks.find((track) => track.fuente === "chrome_tab");
  if (!user || !chrome || !user.bytes.length || !chrome.bytes.length) throw new Error("dialogo_pistas_incompletas");
  if (user.bytes.length > MAX_SOURCE_BYTES || chrome.bytes.length > MAX_SOURCE_BYTES) throw new Error("dialogo_fuente_excede_limite");
  const directory = await mkdtemp(join(tmpdir(), "khora-dialogo-master-"));
  try {
    const decode = async (track: AudioDialogo, name: string) => {
      const input = join(directory, name + ".webm");
      const output = join(directory, name + ".pcm");
      await writeFile(input, track.bytes);
      await runFfmpeg(["-i", input, "-map", "0:a:0", "-vn", "-ac", "2", "-ar", "16000", "-acodec", "pcm_s16le", "-f", "s16le", "-y", output]);
      const stereo = await readFile(output);
      if (!stereo.length || stereo.length % 4) throw new Error("dialogo_pcm_decode_invalido");
      return downmixStereoPcm16Safely(stereo);
    };
    const [userPcm, chromePcm] = await Promise.all([decode(user, "usuario"), decode(chrome, "chrome")]);
    const master = encodeStereoMasterWav(userPcm, chromePcm, user.offsetMs, chrome.offsetMs, 16000);
    if (master.length > MAX_MASTER_BYTES || master.toString("ascii", 0, 4) !== "RIFF" || master.toString("ascii", 8, 12) !== "WAVE") throw new Error("dialogo_master_wav_invalido");
    return master;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
