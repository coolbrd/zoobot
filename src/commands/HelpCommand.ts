import { betterSend } from "../discordUtility/messageMan";
import CommandParser from "../structures/CommandParser";
import Command, { CommandSection } from "../structures/Command";
import { commandHandler } from "../structures/CommandHandler";
import { stripIndents } from "common-tags";

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

        if (!commandName) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix));
            return;
        }

        const command = commandHandler.getCommand(commandName.toLowerCase(), parsedMessage.originalMessage);

        if (!command) {
            betterSend(parsedMessage.channel, `No command by the name "${commandName}" exists.`);
            return;
        }

        betterSend(parsedMessage.channel, command.help(parsedMessage.displayPrefix));
    }
}