import { betterSend } from "../discordUtility/messageMan";
import CommandParser from "../structures/CommandParser";
import Command, { CommandSection } from "../structures/Command";
import { commandHandler } from "../structures/CommandHandler";
import { stripIndents } from "common-tags";

// Displays help information about any given command
export default class HelpCommand extends Command {
    public readonly commandNames = ["help", "h"];

    public readonly info = "View more information about the usage of a command";

    public readonly section = CommandSection.info;

    public help(prefix: string): string {
        return stripIndents`
            Use \`${prefix}${this.commandNames[0]}\` \`<command>\` to see more information about the usage of a particular command.
            
            Or, use \`${prefix}commands\` to view a full list of all available commands.
        `;
    }

    public async run(parsedMessage: CommandParser): Promise<void> {
        const commandName = parsedMessage.fullArguments.toLowerCase();

        // If the user didn't provide a command name to search
        if (!commandName) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix));
            return;
        }

        // Try to find a command by the given search term
        const command = commandHandler.getCommand(commandName.toLowerCase(), parsedMessage.originalMessage);

        // If no command by that name exists
        if (!command) {
            betterSend(parsedMessage.channel, `No command by the name "${commandName}" exists.`);
            return;
        }

        // Send help information about the found command
        betterSend(parsedMessage.channel, command.help(parsedMessage.displayPrefix));
    }
}