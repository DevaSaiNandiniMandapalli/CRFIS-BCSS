import { spawn } from "node:child_process";

function run(label, cmd, args, opts = {}) {
  const child = spawn(cmd, args, { stdio: "inherit", shell: true, ...opts });
  child.on("close", (code) => process.exit(code ?? 1));
  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
  return child;
}

run("api", "npm", ["run", "dev:api"]);
run("ui", "npm", ["run", "dev"]);
