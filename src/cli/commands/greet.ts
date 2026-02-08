import type { Command } from "commander";

export function registerGreetCommand(program: Command) {
  program
    .command("greet")
    .description("Greet someone")
    .requiredOption("-n, --name <name>", "Name to greet")
    .action((options: { name: string }) => {
      console.log(`Greetings, ${options.name}!`);
    });
}
