import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import Command from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class AnnounceCommand extends Command {
    public readonly names = ["announce"];
    
    public readonly info = "Make an announcement to the people";

    public readonly helpUseString = "<message> to announce something to every server.";

    public readonly adminOnly = true;

    public async run(parsedMessage: CommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const receipt = this.newReceipt();

        const announcement = parsedMessage.restOfText;

        try {
            beastiaryClient.beastiary.shards.announce(announcement);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error sending an announcement.

                ${error}
            `);
        }

        receipt.reactConfirm = true;
        return receipt;
    }
}
export default new AnnounceCommand();