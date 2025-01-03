import { parseArgs } from "@std/cli/parse-args";
import { getConfig } from "./config.ts";

const subCommands = [
  "status",
  "enable",
  "disable",
  "config",
] as const;
type SubCommand = typeof subCommands[number];

function parseArguments(): {
  subCommand: SubCommand;
  args: (string | number)[];
} {
  const parsedArgs = parseArgs(Deno.args);
  if (!parsedArgs._ || parsedArgs._.length <= 0) {
    console.error(`Please specify a subcommand [ ${subCommands.join(", ")} ]`);
    Deno.exit(1);
  }
  const sc = subCommands.find((sc) => sc === parsedArgs._[0]);
  if (!sc) {
    console.error(`Please specify a subcommand [ ${subCommands.join(", ")} ]`);
    Deno.exit(1);
  }

  if (parsedArgs._.length <= 1) {
    return { subCommand: sc, args: [] };
  }
  return { subCommand: sc, args: parsedArgs._.slice(1) };
}

async function execCommand(command: Deno.Command) {
  const { code, stdout, stderr } = await command.output();
  if (code === 0) {
    return;
  }
  if (stdout) {
    console.log(new TextDecoder("utf8").decode(stdout));
  }
  if (stderr) {
    console.error(new TextDecoder("utf8").decode(stderr));
  }
  Deno.exit(code);
}

async function printPortProxy() {
  const command = new Deno.Command("netsh", {
    args: [
      "interface",
      "portProxy",
      "show",
      "v4tov4",
    ],
  });
  const { code, stdout, stderr } = await command.output();
  if (stdout) {
    console.log(new TextDecoder("utf8").decode(stdout));
  }
  if (stderr) {
    console.error(new TextDecoder("utf8").decode(stderr));
  }
  if (code !== 0) {
    Deno.exit(code);
  }
}

async function addPortProxy(
  listenAddr: string,
  connectAddr: string,
  bindPorts: number[],
) {
  for (const bindPort of bindPorts) {
    const command = new Deno.Command("netsh", {
      args: [
        "interface",
        "portProxy",
        "add",
        "v4tov4",
        `listenAddress=${listenAddr}`,
        `listenPort=${bindPort}`,
        `connectAddress=${connectAddr}`,
        `connectPort=${bindPort}`,
      ],
    });
    await execCommand(command);
  }
}

async function deletePortProxy(
  listenAddr: string,
  bindPorts: number[],
) {
  for (const bindPort of bindPorts) {
    const command = new Deno.Command("netsh", {
      args: [
        "interface",
        "portProxy",
        "delete",
        "v4tov4",
        `listenAddress=${listenAddr}`,
        `listenPort=${bindPort}`,
      ],
    });
    await execCommand(command);
  }
}

async function printFirewall(ruleName: string) {
  const command = new Deno.Command("netsh", {
    args: [
      "advFirewall",
      "firewall",
      "show",
      "rule",
      `name=${ruleName}`,
    ],
  });
  const { code, stdout, stderr } = await command.output();
  if (stdout) {
    console.log(new TextDecoder("utf8").decode(stdout));
  }
  if (stderr) {
    console.error(new TextDecoder("utf8").decode(stderr));
  }
  if (code !== 0) {
    Deno.exit(code);
  }
}

async function enableFirewall(ruleName: string) {
  const command = new Deno.Command("netsh", {
    args: [
      "advFirewall",
      "firewall",
      "set",
      "rule",
      `name=${ruleName}`,
      "new",
      "enable=yes",
    ],
  });
  await execCommand(command);
}

async function disableFirewall(ruleName: string) {
  const command = new Deno.Command("netsh", {
    args: [
      "advFirewall",
      "firewall",
      "set",
      "rule",
      `name=${ruleName}`,
      "new",
      "enable=no",
    ],
  });
  await execCommand(command);
}

async function main() {
  if (Deno.build.os !== "windows") {
    console.error("Only Windows is supported");
    Deno.exit(1);
  }

  const { subCommand, args } = parseArguments();
  switch (subCommand) {
    case "status": {
      const config = await getConfig();
      if (!config) {
        Deno.exit(1);
      }

      await printPortProxy();

      if (args.length === 1) {
        const service = config[args[0]];
        if (!service) {
          console.error(
            `There are no settings for the specified service (${args[0]})`,
          );
          Deno.exit(1);
        }
        await printFirewall(service.fwRuleName);
        break;
      }

      // show all services
      const keys = Object.keys(config);
      for (const key of keys) {
        console.log(`Firewall settings by ${key}`);
        const service = config[key];
        await printFirewall(service.fwRuleName);
      }
      break;
    }
    case "enable": {
      if (args.length !== 1) {
        console.error("Subcommand args length is 1");
        Deno.exit(1);
      }
      const config = await getConfig();
      if (!config) {
        Deno.exit(1);
      }

      const service = config[args[0]];
      if (!service) {
        console.error(
          `There are no settings for the specified service (${args[0]})`,
        );
        Deno.exit(1);
      }
      await addPortProxy(
        service.listenAddr,
        service.connectAddr,
        service.bindPorts,
      );
      await enableFirewall(service.fwRuleName);
      console.log("Enabled");
      break;
    }
    case "disable": {
      if (args.length !== 1) {
        console.error("Subcommand args length is 1");
        Deno.exit(1);
      }
      const config = await getConfig();
      if (!config) {
        Deno.exit(1);
      }

      const service = config[args[0]];
      if (!service) {
        console.error(
          `There are no settings for the specified service (${args[0]})`,
        );
        Deno.exit(1);
      }
      await deletePortProxy(service.listenAddr, service.bindPorts);
      await disableFirewall(service.fwRuleName);
      console.log("Disabled");
      break;
    }
    case "config": {
      const config = await getConfig();
      console.log(config);
      break;
    }
    default: {
      console.error("Unknown subcommand");
      Deno.exit(1);
    }
  }
  Deno.exit();
}

await main();
