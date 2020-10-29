import Command from "../structures/Command";
import CommandParser from "../structures/CommandParser";
import { betterSend } from "../discordUtility/messageMan";
import { CommonNameTemplate, SpeciesCardTemplate, Species } from "../models/Species";
import SpeciesEditMessage from "../messages/SpeciesEditMessage";
import { SimpleEDoc } from "../structures/EDoc";
import { beastiary } from "../beastiary/Beastiary";
import { encounterHandler } from "../beastiary/EncounterHandler";

// The command used to review, edit, and approve a pending species into a real species
export default class EditSpeciesCommand extends Command {
    public readonly commandNames = ["edit", "editspecies"];

    public readonly info = "Edit an existing species";

    public readonly adminOnly = true;

    public help(commandPrefix: string): string {
        return `Use \`${commandPrefix}${this.commandNames[0]}\` \`<species name>\` to edit an existing species.`;
    }

    public async run(parsedMessage: CommandParser): Promise<void> {
        // If the user provided no search term
        if (!parsedMessage.fullArguments) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix));
            return;
        }

        const fullSearchTerm = parsedMessage.fullArguments.toLowerCase();

        // Get a species whose first common name is the search term
        let species: Species | undefined;
        try {
            species = await beastiary.species.fetchByCommonName(fullSearchTerm);
        }
        catch (error) {
            throw new Error(`There was an error fetching a species in the edit species command: ${error}`);
        }

        // If nothing was found by that name
        if (!species) {
            betterSend(parsedMessage.channel, `No species with the common name "${fullSearchTerm}" could be found.`);
            return;
        }

        // Create a new species edit message from the species object and send it
        const editMessage = new SpeciesEditMessage(parsedMessage.channel, species);
        try {
            await editMessage.send();
        }
        catch (error) {
            throw new Error(`There was an error sending a species edit message: ${error}`);
        }

        // When the message's time limit is reached
        editMessage.once("timeExpired", () => {
            betterSend(parsedMessage.channel, "Time limit expired.");
        });

        // When the user presses the exit button
        editMessage.once("exit", () => {
            betterSend(parsedMessage.channel, "Edit process aborted.");
        });

        // When the editing process is complete
        editMessage.once("submit", (finalDocument: SimpleEDoc) => {
            if (!species) {
                throw new Error("Undefined species value somehow encountered after species edit document submission.");
            }

            species.setCommonNameObjects(finalDocument["commonNames"] as unknown as CommonNameTemplate[]);
            species.scientificName = finalDocument["scientificName"] as string;
            species.setCards(finalDocument["cards"] as unknown as SpeciesCardTemplate[]);
            species.description = finalDocument["description"] as string;
            species.naturalHabitat = finalDocument["naturalHabitat"] as string;
            species.wikiPage = finalDocument["wikiPage"] as string;
            species.rarity = finalDocument["rarity"] as number;
            
            species.save().then(() => {
                betterSend(parsedMessage.channel, "Edit successful.");

                encounterHandler.loadRarityTable().catch(error => {
                    throw new Error(`There was an error reloading the species rarity table after adding a new species: ${error}`);
                });
            }).catch(error => {
                throw new Error(`There was an error saving a species after editing it: ${error}`);
            })
        });
    }
}