import { Command } from "commander";
import { registerHelloCommand, registerGreetCommand } from "./commands";

const program = new Command();

program
  .name("wt")
  .description("A CLI tool")
  .version("1.0.0", "-v, --version")
  .action(() => {
    console.log(`
      *
     /|\\
    / | \\
   /  |  \\
  /   |   \\
 /___|___\\
     |
     |
   Hey!
    `);
  });

registerHelloCommand(program);
registerGreetCommand(program);

export { program };

export function run() {
  program.parse(process.argv);
}
