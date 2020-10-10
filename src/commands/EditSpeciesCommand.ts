import Command from "../structures/CommandInterface";
import CommandParser from "../structures/CommandParser";
import { betterSend } from "../discordUtility/messageMan";
import { CommonNameTemplate, SpeciesCardTemplate, Species } from "../models/Species";
import SpeciesEditMessage from "../messages/SpeciesEditMessage";
import { SimpleEDoc } from "../structures/EDoc";
import { beastiary } from "../beastiary/Beastiary";

// The command used to review, edit, and approve a pending species into a real species
export default class EditSpeciesCommand implements Command {
    public readonly commandNames = ["edit", "editspecies"];

    public readonly adminOnly = true;

    public help(commandPrefix: string): string {
        return `Use \`${commandPrefix}edit\` \`<species name>\` to edit an existing species.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        const channel = parsedUserCommand.channel;
        
        const fullSearchTerm = parsedUserCommand.fullArguments.toLowerCase();

        if (!fullSearchTerm) {
            betterSend(channel, this.help(parsedUserCommand.displayPrefix));
            return;
        }

        let species: Species | undefined;
        // Get a species whose first common name is the search term
        try {
            species = await beastiary.species.fetchByCommonName(fullSearchTerm);
        }
        catch (error) {
            throw new Error(`There was an error fetching a species in the edit species command: ${error}`);
        }

        // If nothing was found by that name
        if (!species) {
            betterSend(channel, `No species with the common name "${fullSearchTerm}" could be found.`);
            return;
        }

        // Create a new species edit message from the species object and send it
        const editMessage = new SpeciesEditMessage(channel, species);
        try {
            await editMessage.send();
        }
        catch (error) {
            throw new Error(`There was an error sending a species edit message: ${error}`);
        }

        // When the message's time limit is reached
        editMessage.once("timeExpired", () => {
            betterSend(channel, "Time limit expired.");
        });

        // When the user presses the exit button
        editMessage.once("exit", () => {
            betterSend(channel, "Edit process aborted.");
        });

        // When the editing process is complete
        editMessage.once("submit", (finalDocument: SimpleEDoc) => {
            if (!species) {
                throw new Error("Undefined species value somehow encountered after species edit document submission.");
            }
            
            // Assign the species its new information
            species.setFields({
                commonNames: finalDocument["commonNames"] as unknown as CommonNameTemplate[],
                scientificName: finalDocument["scientificName"] as string,
                cards: finalDocument["cards"] as unknown as SpeciesCardTemplate[],
                description: finalDocument["description"] as string,
                naturalHabitat: finalDocument["naturalHabitat"] as string,
                wikiPage: finalDocument["wikiPage"] as string,
                rarity: finalDocument["rarity"] as number
            }).then(() => {
                betterSend(channel, "Edit successful.");
            }).catch(error => {
                throw new Error(`There was an error editing a species: ${error}`);
            });
        });
    }
}