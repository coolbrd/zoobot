import Command from "../structures/Command";
import CommandParser from "../structures/CommandParser";
import { betterSend } from "../discordUtility/messageMan";
import { CommonNameTemplate, SpeciesCardTemplate, Species } from "../models/Species";
import SpeciesEditMessage from "../messages/SpeciesEditMessage";
import { SimpleEDoc } from "../structures/EDoc";
import { beastiary } from "../beastiary/Beastiary";
import { encounterHandler } from "../beastiary/EncounterHandler";

export default class EditSpeciesCommand extends Command {
    public readonly commandNames = ["edit", "editspecies"];

    public readonly info = "Edit an existing species";

    public readonly adminOnly = true;

    public help(commandPrefix: string): string {
        return `Use \`${commandPrefix}${this.commandNames[0]}\` \`<species name>\` to edit an existing species.`;
    }

    public async run(parsedMessage: CommandParser): Promise<void> {
        if (!parsedMessage.fullArguments) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix));
            return;
        }

        const fullSearchTerm = parsedMessage.fullArguments.toLowerCase();

        let species: Species | undefined;
        try {
            species = await beastiary.species.fetchByCommonName(fullSearchTerm);
        }
        catch (error) {
            throw new Error(`There was an error fetching a species in the edit species command: ${error}`);
        }

        if (!species) {
            betterSend(parsedMessage.channel, `No species with the common name "${fullSearchTerm}" could be found.`);
            return;
        }

        const editMessage = new SpeciesEditMessage(parsedMessage.channel, species);
        try {
            await editMessage.send();
        }
        catch (error) {
            throw new Error(`There was an error sending a species edit message: ${error}`);
        }

        editMessage.once("timeExpired", () => {
            betterSend(parsedMessage.channel, "Time limit expired.");
        });

        editMessage.once("exit", () => {
            betterSend(parsedMessage.channel, "Edit process aborted.");
        });

        editMessage.once("submit", (finalDocument: SimpleEDoc) => {
            if (!species) {
                throw new Error("Undefined species value somehow encountered after species edit document submission.");
            }

            species.setCommonNameObjects(finalDocument[Species.fieldNames.commonNames] as unknown as CommonNameTemplate[]);
            species.scientificName = finalDocument[Species.fieldNames.scientificName] as string;
            species.setCards(finalDocument[Species.fieldNames.cards] as unknown as SpeciesCardTemplate[]);
            species.description = finalDocument[Species.fieldNames.description] as string;
            species.naturalHabitat = finalDocument[Species.fieldNames.naturalHabitat] as string;
            species.wikiPage = finalDocument[Species.fieldNames.wikiPage] as string;
            species.rarity = finalDocument[Species.fieldNames.rarity] as number;
            
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