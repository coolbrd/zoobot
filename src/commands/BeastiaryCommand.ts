import { stripIndent } from "common-tags";
import BeastiaryMessage from "../messages/BeastiaryMessage";
import Command, { CommandSection } from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class BeastiaryCommand extends Command {
    public readonly commandNames = ["beastiary", "bestiary", "b"];

    public readonly info = "View the list of all species available in The Beastiary";

    public readonly helpUseString = "to view a list of every collectible species.";

    public readonly section = CommandSection.gettingStarted;

    public async run(parsedUserCommand: CommandParser, commandReceipt: CommandReceipt): Promise<CommandReceipt> {
        const beastiaryMessage = new BeastiaryMessage(parsedUserCommand.channel, parsedUserCommand.originalMessage.author);
        try {
            await beastiaryMessage.send();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error sending a beastiary message.

                Message: ${beastiaryMessage.debugString}
                
                ${error}
            `);
        }

        return commandReceipt;
    }
}
export default new BeastiaryCommand();