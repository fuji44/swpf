import { join } from "@std/path/join";
import { parse } from "@std/toml/parse";
import dir from "https://deno.land/x/dir@1.5.2/mod.ts";

const configFileName = ".swpf.toml";
type Service = {
  listenAddr: string;
  connectAddr: string;
  bindPorts: number[];
  fwRuleName: string;
};

function isService(obj: unknown): obj is Service {
  if (
    typeof obj !== "object" ||
    obj === null ||
    !("listenAddr" in obj) ||
    !("connectAddr" in obj) ||
    !("bindPorts" in obj) ||
    !("fwRuleName" in obj) ||
    typeof (obj as Service).listenAddr !== "string" ||
    typeof (obj as Service).connectAddr !== "string" ||
    !Array.isArray((obj as Service).bindPorts) ||
    !((obj as Service).bindPorts.every((port) => typeof port === "number")) ||
    typeof (obj as Service).fwRuleName !== "string"
  ) {
    return false;
  }
  return true;
}

function isConfig(
  config: Record<string, unknown>,
): config is Record<string, Service> {
  const keys = Object.keys(config);
  if (!keys) {
    return false;
  }
  for (const key of keys) {
    if (!isService(config[key])) {
      return false;
    }
  }
  return true;
}

export async function getConfig() {
  const homeDir = dir("home");
  if (!homeDir) {
    console.error("Unable to retrieve Config directory");
    return;
  }
  const configFilePath = join(homeDir, configFileName);
  try {
    const config = await Deno.readTextFile(configFilePath);
    const parsedConfig = parse(config);
    if (!isConfig(parsedConfig)) {
      console.error("Config parse failed");
      return;
    }
    return parsedConfig;
  } catch (_error) {
    console.error(`Config file read failed. ${configFilePath}`);
    return;
  }
}
