import Command from "../structures/Command";
import CommandParser from "../structures/CommandParser";
import { Species } from "../models/Species";
import { betterSend } from "../discordUtility/messageMan";
import SpeciesInfoMessage from "../messages/SpeciesInfoMessage";
import { beastiary } from "../beastiary/Beastiary";

// Sends an informational message about a given species
export default class SpeciesInfoCommand implements Command {
    public readonly commandNames = ["info", "i", "search"];

    public readonly info = "View a species' information and collectible cards";

    public help(commandPrefix: string): string {
        return `Use \`${commandPrefix}${this.commandNames[0]}\` \`<species>\` to view a species' traits and cards.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        const channel = parsedUserCommand.channel;

        const fullSearchTerm = parsedUserCommand.fullArguments.toLowerCase();

        if (!fullSearchTerm) {
            betterSend(channel, this.help(parsedUserCommand.displayPrefix));
            return;
        }

        // Find a species by its common name
        let species: Species | undefined;
        try {
            species = await beastiary.species.fetchByCommonName(fullSearchTerm);
        }
        catch (error) {
            throw new Error(`There was an error fetching a species by its common name in the species info comman: ${error}`);
        }

        // If no species with the given name was found
        if (!species) {
            betterSend(channel, `No animal by the name "${fullSearchTerm}" could be found.`);
            return;
        }

        // Construct and send an informational message about the species
        const infoMessage = new SpeciesInfoMessage(channel, species);
        try {
            await infoMessage.send();
        }
        catch (error) {
            throw new Error(`There was an error sending a new species info message: ${error}`);
        }
    }
}