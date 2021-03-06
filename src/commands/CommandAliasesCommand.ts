import BeastiaryClient from "../bot/BeastiaryClient";
import { betterSend } from "../discordUtility/messageMan";
import Command, { CommandArgumentInfo, CommandSection } from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class CommandAliasesCommand extends Command {
    public readonly names = ["alias", "aliases", "a"];

    public readonly info = "View the alternate names and abbreviations of a command";

    public readonly helpUseString = "`<command name>` to view the valid aliases of that command.";

    public readonly sections = [CommandSection.info];

    public readonly arguments: CommandArgumentInfo[] = [
        {
            name: "command name",
            info: "the name of the command"
        }
    ];

    public async run(parsedMessage: CommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();
        
        const commandName = parsedMessage.restOfText.toLowerCase();

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
        for (let i = 1; i < command.names.length; i++) {
            aliasString += `\`${command.names[i]}\``;
            if (i < command.names.length - 1) {
                aliasString += ", ";
            }
        }
        aliasString = aliasString || "None";

        betterSend(parsedMessage.channel, `Aliases for \`${command.names[0]}\`: ${aliasString}`);

        return commandReceipt;
    }
}
export default new CommandAliasesCommand();