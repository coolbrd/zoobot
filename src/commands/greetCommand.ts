import Command from './commandInterface';
import CommandParser from '../utility/commandParser';

// Greets the user
export class GreetCommand implements Command {
    commandNames = [`greet`, `hello`];

    help(commandPrefix: string): string {
        return `Use ${commandPrefix}greet to get a greeting.`;
    }

    async run(parsedUserCommand: CommandParser): Promise<void> {
        await parsedUserCommand.originalMessage.channel.send(`Hello, user!`);
    }
}