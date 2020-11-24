import { betterSend } from "../discordUtility/messageMan";
import CommandParser from "../structures/Command/CommandParser";
import Command, { CommandSection } from "../structures/Command/Command";
import CommandReceipt from "../structures/Command/CommandReceipt";
import CommandResolver from "../structures/Command/CommandResolver";
import BeastiaryClient from "../bot/BeastiaryClient";

class HelpCommand extends Command {
    public readonly commandNames = ["help", "h"];

    public readonly info = "View more information about the usage of a command";

    public readonly helpUseString = "to see more information about the usage of a particular command.";

    public readonly section = CommandSection.info;

    public async run(parsedMessage: CommandParser, commandReceipt: CommandReceipt, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandName = parsedMessage.fullArguments.toLowerCase();

        if (!commandName) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
        }

        const commandResolver = new CommandResolver(parsedMessage, beastiaryClient.commandHandler.baseCommands);

        if (!commandResolver.command) {
            betterSend(parsedMessage.channel, `No command by the name "${commandName}" exists.`);
            return commandReceipt;
        }

        const displayPrefix = commandResolver.commandParser.displayPrefix;
        const specifiedCommandChain = commandResolver.commandParser.commandChain.slice(1);
        betterSend(parsedMessage.channel, commandResolver.command.help(displayPrefix, specifiedCommandChain));

        return commandReceipt;
    }
}
export default new HelpCommand();