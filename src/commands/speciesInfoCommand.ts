import Command from "./commandInterface";
import CommandParser from "../utility/commandParser";
import { Species, SpeciesObject } from "../models/species";
import { betterSend } from "../utility/toolbox";
import { SpeciesInfoMessage } from "../messages/speciesInfoMessage";

export class SpeciesInfoCommand implements Command {
    public readonly commandNames = ['info'];

    public help(commandPrefix: string): string {
        return `Use ${commandPrefix}info <species> to view a species' traits and images.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        const channel = parsedUserCommand.channel;

        const fullSearchTerm = parsedUserCommand.args.join(' ').toLowerCase();

        const exclusions = { _id: 0 };
        const speciesDocument = await Species.findOne({ commonNames: fullSearchTerm }, exclusions) || await Species.findOne({ scientificName: fullSearchTerm }, exclusions);

        if (!speciesDocument) {
            betterSend(channel, `No animal by the name "${fullSearchTerm}" could be found.`);
            return;
        }

        const species = speciesDocument.toObject() as SpeciesObject;

        const infoMessage = new SpeciesInfoMessage(channel, species);
        infoMessage.send();
    }
}