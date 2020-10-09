import { betterSend } from "../discordUtility/messageMan";
import CommandParser from "../structures/CommandParser";
import Command from "../structures/CommandInterface";
import { commandHandler } from "../structures/CommandHandler";

export default class HelpCommand implements Command {
    public readonly commandNames = ["help", "h"];

    public help(prefix: string): string {
        return `Use \`${prefix}help\` \`<command>\` to see more information about the usage of a particular command.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        const commandName = parsedUserCommand.fullArguments.toLowerCase();

        // If the user didn't provide a command name to search
        if (!commandName) {
            betterSend(parsedUserCommand.channel, this.help(parsedUserCommand.displayPrefix));
            return;
        }

        // Try to find a command by the given search term
        const command = commandHandler.getCommand(commandName.toLowerCase(), parsedUserCommand.originalMessage);

        // If no command by that name exists
        if (!command) {
            betterSend(parsedUserCommand.channel, `No command by the name "${commandName}" exists.`);
            return;
        }

        // Send help information about the found command
        betterSend(parsedUserCommand.channel, command.help(parsedUserCommand.displayPrefix));
    }
}