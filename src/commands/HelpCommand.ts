import { betterSend } from "../discordUtility/messageMan";
import CommandParser from "../structures/Command/CommandParser";
import Command, { CommandArgumentInfo, CommandSection } from "../structures/Command/Command";
import CommandReceipt from "../structures/Command/CommandReceipt";
import CommandResolver from "../structures/Command/CommandResolver";
import BeastiaryClient from "../bot/BeastiaryClient";
import CommandListCommand from "./CommandListCommand";
import { stripIndent } from "common-tags";

class HelpCommand extends Command {
    public readonly names = ["help", "h"];

    public readonly info = "View more information about the usage of a command";

    public readonly helpUseString = stripIndent`
        \`<command name>\` to see more information about the usage of that command.
        If you're looking for a full list of commands, try the \`${CommandListCommand.primaryName}\` command.
    `;

    public readonly sections = [CommandSection.gettingStarted, CommandSection.info];

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
            const commandReceipt = await CommandListCommand.execute(parsedMessage, beastiaryClient);
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