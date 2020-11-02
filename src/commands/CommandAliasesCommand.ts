import { betterSend } from "../discordUtility/messageMan";
import Command, { CommandSection } from "../structures/Command";
import { commandHandler } from "../structures/CommandHandler";
import CommandParser from "../structures/CommandParser";

export default class CommandAliasesCommand extends Command {
    public readonly commandNames = ["alias", "aliases", "a"];

    public readonly info = "View the alternate names and abbreviations of a command";

    public readonly section = CommandSection.info;

    public help(displayPrefix: string): string {
        return `Use \`${displayPrefix}${this.commandNames[0]}\` to view the valid aliases of a command.`;
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

        let aliasString = "";
        // Starts at position 1 so the primary command name is omitted (it was stated earlier)
        for (let i = 1; i < command.commandNames.length; i++) {
            aliasString += `\`${command.commandNames[i]}\``;
            if (i < command.commandNames.length - 1) {
                aliasString += ", ";
            }
        }
        aliasString = aliasString || "None";

        betterSend(parsedMessage.channel, `Aliases for \`${command.commandNames[0]}\`: ${aliasString}`);
    }
}