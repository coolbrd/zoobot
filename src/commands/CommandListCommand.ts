import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import CommandListMessage from "../messages/CommandListMessage";
import Command, { CommandSection } from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

// Sends an embed containing a list of all non-admin commands and their basic functions
class CommandListCommand extends Command {
    public readonly names = ["commands", "commandlist", "listcommands", "command"];

    public readonly info = "View this message";

    public readonly helpUseString = "to get an overview of all commands and their functions.";

    public readonly sections = [CommandSection.info];

    public async run(parsedMessage: CommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandListMessage = new CommandListMessage(parsedMessage.channel, beastiaryClient);

        try {
            await commandListMessage.send();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an errro sending a command list message.

                Message: ${commandListMessage.debugString}
            `);
        }

        return this.newReceipt();
    }
}
export default new CommandListCommand();