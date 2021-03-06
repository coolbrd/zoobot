import Command from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import { betterSend } from "../discordUtility/messageMan";
import { CommonNameTemplate, Species, SpeciesCardTemplate } from "../structures/GameObject/GameObjects/Species";
import SpeciesEditMessage from "../messages/SpeciesEditMessage";
import { SimpleEDoc } from "../structures/eDoc/EDoc";
import { stripIndent } from "common-tags";
import CommandReceipt from "../structures/Command/CommandReceipt";
import BeastiaryClient from "../bot/BeastiaryClient";
import { inspect } from "util";

class EditSpeciesCommand extends Command {
    public readonly names = ["edit", "editspecies"];

    public readonly info = "Edit an existing species";

    public readonly helpUseString = "`<species name>` to edit an existing species.";

    public readonly adminOnly = true;

    public async run(parsedMessage: CommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();
        
        if (!parsedMessage.restOfText) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
        }

        const fullSearchTerm = parsedMessage.restOfText.toLowerCase();

        let potentialSpecies: Species | undefined;
        try {
            potentialSpecies = await beastiaryClient.beastiary.species.searchSingleSpeciesByCommonNameAndHandleDisambiguation(fullSearchTerm, parsedMessage.channel);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching a species in the edit species command.

                Search term: ${fullSearchTerm}
                Channel: ${inspect(parsedMessage.channel)}
                
                ${error}
            `);
        }

        if (!potentialSpecies) {
            return commandReceipt;
        }

        const species = potentialSpecies;

        const editMessage = new SpeciesEditMessage(parsedMessage.channel, beastiaryClient, potentialSpecies);
        try {
            await editMessage.send();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error sending a species edit message.
                
                ${error}
            `);
        }

        editMessage.once("timeExpired", () => {
            betterSend(parsedMessage.channel, "Time limit expired.");
        });

        editMessage.once("exit", () => {
            betterSend(parsedMessage.channel, "Edit process aborted.");
        });

        editMessage.once("submit", (finalDocument: SimpleEDoc) => {
            species.setCommonNameObjects(finalDocument[Species.fieldNames.commonNames] as unknown as CommonNameTemplate[]);
            species.scientificName = finalDocument[Species.fieldNames.scientificName] as string;
            species.setCards(finalDocument[Species.fieldNames.cards] as unknown as SpeciesCardTemplate[]);
            species.description = finalDocument[Species.fieldNames.description] as string;
            species.naturalHabitat = finalDocument[Species.fieldNames.naturalHabitat] as string;
            species.wikiPage = finalDocument[Species.fieldNames.wikiPage] as string;
            species.rarityTier = finalDocument[Species.fieldNames.rarityTier] as number;
            species.token = finalDocument[Species.fieldNames.token] as string;
            
            beastiaryClient.beastiary.species.refreshSpecies().catch(error => {
                throw new Error(stripIndent`
                    There was an error reloading the species rarity table after adding a new species.
                    
                    ${error}
                `);
            });
            
            betterSend(parsedMessage.channel, "Edit successful.");
        });

        return commandReceipt;
    }
}
export default new EditSpeciesCommand();