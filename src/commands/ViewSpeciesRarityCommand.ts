import { stripIndent } from "common-tags";
import { inspect } from "util";
import BeastiaryClient from "../bot/BeastiaryClient";
import SpeciesRarityMessage from "../messages/SpeciesRarityMessage";
import Command from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class ViewSpeciesRarityCommand extends Command {
    public readonly names = ["viewrarity", "vr"];

    public readonly info = "View the rarity of all species";

    public readonly helpUseString = "to view the rarity percentage of all species within The Beastiary.";

    public readonly adminOnly = true;

    public async run(parsedMessage: CommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const rarityMessage = new SpeciesRarityMessage(parsedMessage.channel, beastiaryClient);

        try {
            await rarityMessage.send();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error sending a species rarity message.

                Message: ${inspect(rarityMessage)}

                ${error}
            `);
        }

        return this.newReceipt();
    }
}
export default new ViewSpeciesRarityCommand();