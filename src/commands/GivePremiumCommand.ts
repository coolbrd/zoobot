import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import handleUserError from "../discordUtility/handleUserError";
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

        const idOrPermenent = parsedMessage.consumeArgument().text.toLowerCase();

        let id: string;
        let permanent: boolean;
        if (idOrPermenent === "permanent") {
            if (!parsedMessage.currentArgument) {
                betterSend(parsedMessage.channel, "You need to specify the guild id to grant permanent premium status to.");
                return receipt;
            }

            id = parsedMessage.consumeArgument().text;
            permanent = true;
        }
        else {
            id = idOrPermenent;
            permanent = false;
        }

        try {
            await beastiaryClient.beastiary.playerGuilds.givePremium(id, permanent);
        }
        catch (error) {
            handleUserError(parsedMessage.channel, error);
            return receipt;
        }
        
        receipt.reactConfirm = true;
        return receipt;
    }
}
export default new GivePremiumCommand();