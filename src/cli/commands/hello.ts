import type { Command } from "commander";

export function registerHelloCommand(program: Command) {
  program
    .command("hello")
    .description("Say hello")
    .argument("[name]", "Name to greet", "world")
    .option("-u, --uppercase", "Print in uppercase")
    .action((name: string, options: { uppercase?: boolean }) => {
      const greeting = `Hello, ${name}!`;
      console.log(options.uppercase ? greeting.toUpperCase() : greeting);
    });
}
