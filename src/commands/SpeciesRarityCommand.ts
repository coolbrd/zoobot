import { stripIndents } from "common-tags";
import SpeciesRarityMessage from '../messages/SpeciesRarityMessage';
import Command from '../structures/Command/Command';
import CommandParser from '../structures/Command/CommandParser';
import CommandReceipt from "../structures/Command/CommandReceipt";

class SpeciesRarityCommand extends Command {
    public readonly commandNames = ["viewrarity", "vr"];

    public readonly info = "View the rarity of all species and their images";

    public readonly adminOnly = true;

    public help(displayPrefix: string): string {
        return `Use \`${displayPrefix}${this.commandNames[0]}\` to view the Beastiary of animals with their rarity values displayed in percentage.`;
    }

    public async run(parsedMessage: CommandParser, commandReceipt: CommandReceipt): Promise<CommandReceipt> {
        const rarityMessage = new SpeciesRarityMessage(parsedMessage.channel);

        try {
            await rarityMessage.send();
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error sending a species rarity message.

                Rarity message: ${JSON.stringify(rarityMessage)}
                
                ${error}
            `);
        }

        return commandReceipt;
    }
}
export default new SpeciesRarityCommand();