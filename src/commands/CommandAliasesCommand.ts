import BeastiaryClient from "../bot/BeastiaryClient";
import { betterSend } from "../discordUtility/messageMan";
import Command, { CommandSection } from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class CommandAliasesCommand extends Command {
    public readonly commandNames = ["alias", "aliases", "a"];

    public readonly info = "View the alternate names and abbreviations of a command";

    public readonly helpUseString = "to view the valid aliases of a command.";

    public readonly section = CommandSection.info;

    public async run(parsedMessage: CommandParser, commandReceipt: CommandReceipt, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandName = parsedMessage.fullArguments.toLowerCase();

        if (!commandName) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
        }

        const command = beastiaryClient.commandHandler.getCommandByParser(parsedMessage);

        if (!command) {
            betterSend(parsedMessage.channel, `No command by the name "${commandName}" exists.`);
            return commandReceipt;
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

        return commandReceipt;
    }
}
export default new CommandAliasesCommand();