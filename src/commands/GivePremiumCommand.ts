import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import { betterSend } from "../discordUtility/messageMan";
import Command from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class GivePremiumCommand extends Command {
    public readonly names = ["givepremium", "gp"];

    public readonly info = "Give premium status to a server or user";

    public readonly helpUseString = "`<id>` to give premium status to a server or user.";

    public readonly adminOnly = true;

    public async run(parsedMessage: CommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const receipt = this.newReceipt();

        if (!parsedMessage.currentArgument) {
            betterSend(parsedMessage.channel, "You need to specify the id to grant premium status to.");
            return receipt;
        }

        const id = parsedMessage.consumeArgument().text;

        try {
            await beastiaryClient.beastiary.playerGuilds.givePremium(id);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error giving an id premium.

                Id: ${id}

                ${error}
            `);
        }
        
        receipt.reactConfirm = true;
        return receipt;
    }
}
export default new GivePremiumCommand();