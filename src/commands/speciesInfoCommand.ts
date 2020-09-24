import Command from "../structures/commandInterface";
import CommandParser from "../structures/commandParser";
import { Species, SpeciesObject } from "../models/species";
import { betterSend } from "../discordUtility/messageMan";
import { SpeciesInfoMessage } from "../messages/speciesInfoMessage";
import { interactiveMessageHandler } from "..";

export class SpeciesInfoCommand implements Command {
    public readonly commandNames = ['info', 'i', 'search'];

    public help(commandPrefix: string): string {
        return `Use \`${commandPrefix}info\` \`<species>\` to view a species' traits and images.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        const channel = parsedUserCommand.channel;

        const fullSearchTerm = parsedUserCommand.fullArguments.toLowerCase();

        // Find a species by either its common name, or its scientific name if no common name matches were made
        const speciesDocument = await Species.findOne({ commonNamesLower: fullSearchTerm }) || await Species.findOne({ scientificName: fullSearchTerm });

        // If no species with the given name was found
        if (!speciesDocument) {
            betterSend(channel, `No animal by the name "${fullSearchTerm}" could be found.`);
            return;
        }

        // Construct and send an informational message about the species
        const infoMessage = new SpeciesInfoMessage(interactiveMessageHandler, channel, new SpeciesObject({document: speciesDocument}));
        infoMessage.send();
    }
}