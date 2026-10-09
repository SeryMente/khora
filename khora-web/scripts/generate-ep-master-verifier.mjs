import { randomBytes, scryptSync } from "node:crypto";
import readline from "node:readline";

if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
  process.stderr.write("Ejecuta este generador desde una terminal interactiva; no acepta contraseñas por argumentos o stdin redirigido.\n");
  process.exit(2);
}

function readHidden(label) {
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    let value = "";
    process.stdout.write(label);
    input.setRawMode(true);
    input.resume();
    input.setEncoding("utf8");
    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === "\u0003") {
          cleanup();
          reject(new Error("Cancelado"));
          return;
        }
        if (character === "\r" || character === "\n") {
          cleanup();
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (character === "\u007f" || character === "\b") {
          value = value.slice(0, -1);
        } else if (character >= " " && character !== "\u007f") {
          value += character;
        }
      }
    };
    function cleanup() {
      input.off("data", onData);
      input.setRawMode(false);
      input.pause();
    }
    input.on("data", onData);
  });
}

let password = "";
try {
  password = await readHidden("Contraseña maestra nueva (entrada oculta): ");
  if (password.length < 16 || password.length > 1024) {
    throw new Error("Usa una contraseña de 16 a 1024 caracteres.");
  }
  const salt = randomBytes(32);
  const digest = scryptSync(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  process.stdout.write("\n# Copia estos valores al gestor de secretos del entorno KHORA; no los guardes en Git.\n");
  process.stdout.write("EP_MASTER_PASSWORD_SALT=" + salt.toString("hex") + "\n");
  process.stdout.write("EP_MASTER_PASSWORD_HASH=" + digest.toString("hex") + "\n");
  process.stdout.write("EP_MASTER_SESSION_SECRET=" + randomBytes(48).toString("hex") + "\n");
  process.stdout.write("EP_MASTER_SESSION_TTL_SECONDS=900\n");
} catch (error) {
  process.stderr.write((error instanceof Error ? error.message : "Error generando el verificador") + "\n");
  process.exitCode = 1;
} finally {
  password = "";
}
