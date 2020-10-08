import Command from "../structures/CommandInterface";
import CommandParser from "../structures/CommandParser";
import { Species, SpeciesObject } from "../models/Species";
import { betterSend } from "../discordUtility/messageMan";
import SpeciesInfoMessage from "../messages/SpeciesInfoMessage";
import { errorHandler } from "../structures/ErrorHandler";
import { Document } from "mongoose";

export default class SpeciesInfoCommand implements Command {
    public readonly commandNames = ['info', 'i', 'search'];

    public help(commandPrefix: string): string {
        return `Use \`${commandPrefix}info\` \`<species>\` to view a species' traits and images.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        const channel = parsedUserCommand.channel;

        const fullSearchTerm = parsedUserCommand.fullArguments.toLowerCase();

        if (!fullSearchTerm) {
            betterSend(channel, this.help(parsedUserCommand.displayPrefix));
            return;
        }

        let speciesDocument: Document | null;
        // Find a species by either its common name, or its scientific name if no common name matches were made
        try {
            speciesDocument = await Species.findOne({ commonNamesLower: fullSearchTerm }) || await Species.findOne({ scientificName: fullSearchTerm });
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error finding a species by its common name and scientific name.');
            return;
        }

        // If no species with the given name was found
        if (!speciesDocument) {
            betterSend(channel, `No animal by the name "${fullSearchTerm}" could be found.`);
            return;
        }

        // Construct and send an informational message about the species
        const infoMessage = new SpeciesInfoMessage(channel, new SpeciesObject({document: speciesDocument}));
        try {
            await infoMessage.send();
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error sending a new species info message.');
        }
    }
}