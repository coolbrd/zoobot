import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import SpeciesRarityMessage from '../messages/SpeciesRarityMessage';
import Command from '../structures/Command/Command';
import CommandParser from '../structures/Command/CommandParser';
import CommandReceipt from "../structures/Command/CommandReceipt";

class SpeciesRarityCommand extends Command {
    public readonly commandNames = ["viewrarity", "vr"];

    public readonly info = "View the rarity of all species and their images";

    public readonly helpUseString = "to view the Beastiary of animals with their rarity values displayed in percentage.";

    public readonly adminOnly = true;

    public async run(parsedMessage: CommandParser, commandReceipt: CommandReceipt, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const rarityMessage = new SpeciesRarityMessage(parsedMessage.channel, beastiaryClient);

        try {
            await rarityMessage.send();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error sending a species rarity message.

                Rarity message: ${rarityMessage.debugString}
                
                ${error}
            `);
        }

        return commandReceipt;
    }
}
export default new SpeciesRarityCommand();