import Command from '../structures/commandInterface';
import CommandParser from '../structures/commandParser';
import { betterSend } from "../discordUtility/messageMan";
import { CommonNameTemplate, ImageTemplate, Species, SpeciesObject } from '../models/species';
import SpeciesEditMessage from '../messages/speciesEditMessage';
import { SimpleEDoc } from '../structures/eDoc';
import { Document } from 'mongoose';
import { errorHandler } from '../structures/errorHandler';

// The command used to review, edit, and approve a pending species into a real species
export default class EditSpeciesCommand implements Command {
    public readonly commandNames = ['edit', 'editspecies'];

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

        let speciesDocument: Document | null;
        // Get a species whose first common name is the search term
        try {
            speciesDocument = await Species.findOne({ commonNamesLower: fullSearchTerm });
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error finding a species document in the edit species command.');
            return;
        }

        // If nothing was found by that name
        if (!speciesDocument) {
            betterSend(channel, `No species with the common name '${fullSearchTerm}' could be found.`);
            return;
        }

        // Create and load a species object representing the target species
        const speciesObject = new SpeciesObject({ document: speciesDocument });
        try {
            await speciesObject.load();
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error loading a species object in the edit species command.');
            return;
        }

        // Create a new species edit message from the species object and send it
        const editMessage = new SpeciesEditMessage(channel, speciesObject);
        try {
            await editMessage.send();
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error sending a species edit message.');
            return;
        }

        // When the message's time limit is reached
        editMessage.once('timeExpired', () => {
            betterSend(channel, 'Time limit expired.');
        });

        // When the user presses the exit button
        editMessage.once('exit', () => {
            betterSend(channel, 'Edit process aborted.');
        });

        // When the editing process is complete
        editMessage.once('submit', (finalDocument: SimpleEDoc) => {
            // Assign the species its new information
            speciesObject.setFields({
                commonNames: finalDocument['commonNames'] as unknown as CommonNameTemplate[],
                scientificName: finalDocument['scientificName'] as string,
                images: finalDocument['images'] as unknown as ImageTemplate[],
                description: finalDocument['description'] as string,
                naturalHabitat: finalDocument['naturalHabitat'] as string,
                wikiPage: finalDocument['wikiPage'] as string,
                rarity: finalDocument['rarity'] as number
            }).then(() => {
                betterSend(channel, 'Edit successful.');
            }).catch(error => {
                betterSend(channel, 'Edit unsuccessful, inform the developer.');

                errorHandler.handleError(error, 'There was an error editing a species.');
            });
        });
    }
}