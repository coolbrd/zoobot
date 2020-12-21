import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import { betterSend } from "../discordUtility/messageMan";
import Command from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class RemovePremiumCommand extends Command {
    public readonly names = ["removepremium", "rp"];

    public readonly info = "Remove premium status from a server or user";

    public readonly helpUseString = "`<id>` to remove premium status from a server or user.";

    public readonly adminOnly = true;

    public async run(parsedMessage: CommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const receipt = this.newReceipt();

        if (!parsedMessage.currentArgument) {
            betterSend(parsedMessage.channel, "You need to specify the id to remove premium status from.");
            return receipt;
        }

        const id = parsedMessage.consumeArgument().text;

        try {
            await beastiaryClient.beastiary.playerGuilds.removePremium(id);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error removing premium from an id.

                Id: ${id}

                ${error}
            `);
        }
        
        receipt.reactConfirm = true;
        return receipt;
    }
}
export default new RemovePremiumCommand();