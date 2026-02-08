import { Command } from "commander";
import chalk from "chalk";
import {
  registerHostCommand,
  registerUpCommand,
  registerLocalCommand,
  registerEnterCommand,
  registerRunCommand,
  registerSessionsCommand,
  registerGcCommand,
  registerDoctorCommand,
  registerBootstrapCommand,
  registerLsCommand,
  registerRmCommand,
  registerStatusCommand,
  registerRenameCommand,
} from "@/cli/commands";

const program = new Command();

const VERSION = "0.0.5";

function buildTree(cmd: Command, prefix = ""): string[] {
  const lines: string[] = [];
  const name = cmd.name();
  const args = cmd.registeredArguments
    .map((a) => (a.required ? `<${a.name()}>` : `[${a.name()}]`))
    .join(" ");
  const display = args ? `${name} ${args}` : name;

  lines.push(`${prefix}${display}`);

  const subcommands = cmd.commands.filter((c) => c.name() !== "help");

  subcommands.forEach((sub, i) => {
    const isLastChild = i === subcommands.length - 1;
    const connector = isLastChild ? "└── " : "├── ";
    const childPrefix = prefix + (isLastChild ? "    " : "│   ");

    const subName = sub.name();
    const subArgs = sub.registeredArguments
      .map((a) => (a.required ? `<${a.name()}>` : `[${a.name()}]`))
      .join(" ");
    const subDisplay = subArgs ? `${subName} ${subArgs}` : subName;

    const grandchildren = sub.commands.filter((c) => c.name() !== "help");
    if (grandchildren.length > 0) {
      lines.push(`${prefix}${connector}${subDisplay}`);
      grandchildren.forEach((gc, j) => {
        const isLastGC = j === grandchildren.length - 1;
        const gcConnector = isLastGC ? "└── " : "├── ";
        const gcName = gc.name();
        const gcArgs = gc.registeredArguments
          .map((a) => (a.required ? `<${a.name()}>` : `[${a.name()}]`))
          .join(" ");
        const gcDisplay = gcArgs ? `${gcName} ${gcArgs}` : gcName;
        lines.push(`${childPrefix}${gcConnector}${gcDisplay}`);
      });
    } else {
      lines.push(`${prefix}${connector}${subDisplay}`);
    }
  });

  return lines;
}

program
  .name("wt")
  .enablePositionalOptions()
  .description(
    "Run worktrees, coding agents, and more all from the cloud. SSH included, agents too!",
  )
  .version(VERSION, "-v, --version")
  .option("--tree", "Show command tree")
  .action((options) => {
    if (options.tree) {
      console.log(buildTree(program).join("\n"));
      return;
    }

    const asciiArt = `
            __
           /\\ \\__
 __  __  __\\ \\ ,_\\
/\\ \\/\\ \\/\\ \\\\ \\ \\/
\\ \\ \\_/ \\_/ \\\\ \\ \\_
 \\ \\_______/' \\ \\__\\
  \\/__//__/    \\/__/
`;
    console.log(chalk.green(asciiArt));
    console.log(chalk.cyan("Start worktrees in the cloud."));
    console.log(
      chalk.white.bold.italic("wt --help"),
      chalk.gray.italic("to get started.\n"),
    );
    console.log(chalk.dim(`v${VERSION} • https://github.com/abhi-arya1/wt\n`));
  });

registerHostCommand(program);
registerUpCommand(program);
registerLocalCommand(program);
registerEnterCommand(program);
registerRunCommand(program);
registerSessionsCommand(program);
registerGcCommand(program);
registerDoctorCommand(program);
registerBootstrapCommand(program);
registerLsCommand(program);
registerRmCommand(program);
registerStatusCommand(program);
registerRenameCommand(program);

export { program };

export function run() {
  program.parse(process.argv);
}
