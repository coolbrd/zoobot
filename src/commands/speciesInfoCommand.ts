import Command from "./commandInterface";
import CommandParser from "../utility/commandParser";
import { Species, SpeciesObject } from "../models/species";
import { betterSend } from "../utility/toolbox";
import { SpeciesInfoMessage } from "../messages/speciesInfoMessage";

export class SpeciesInfoCommand implements Command {
    public readonly commandNames = ['info', 'search'];

    public help(commandPrefix: string): string {
        return `Use ${commandPrefix}info <species> to view a species' traits and images.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        const channel = parsedUserCommand.channel;

        const fullSearchTerm = parsedUserCommand.args.join(' ').toLowerCase();

        const exclusions = { _id: 0 };
        // Find a species by either its common name, or its scientific name if no common name matches were made
        const speciesDocument = await Species.findOne({ commonNamesLower: fullSearchTerm }, exclusions) || await Species.findOne({ scientificName: fullSearchTerm }, exclusions);

        // If no species with the given name was found
        if (!speciesDocument) {
            betterSend(channel, `No animal by the name "${fullSearchTerm}" could be found.`);
            return;
        }

        // Convert the document to a simple object
        const species = speciesDocument.toObject() as SpeciesObject;
        // Construct and send an informational message about the species
        const infoMessage = new SpeciesInfoMessage(channel, species);
        infoMessage.send();
    }
}