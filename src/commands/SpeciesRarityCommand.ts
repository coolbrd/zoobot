import SpeciesRarityMessage from '../messages/SpeciesRarityMessage';
import Command from '../structures/Command';
import CommandParser from '../structures/CommandParser';

export default class SpeciesRarityCommand extends Command {
    public readonly commandNames = ["viewrarity", "vr"];

    public readonly info = "View the rarity of all species and their images";

    public readonly adminOnly = true;

    public help(displayPrefix: string): string {
        return `Use \`${displayPrefix}${this.commandNames[0]}\` to view the Beastiary of animals with their rarity values displayed in percentage.`;
    }

    public async run(parsedMessage: CommandParser): Promise<void> {
        const rarityMessage = new SpeciesRarityMessage(parsedMessage.channel);

        try {
            await rarityMessage.send();
        }
        catch (error) {
            throw new Error(`There was an error sending a species rarity message: ${error}`);
        }
    }
}