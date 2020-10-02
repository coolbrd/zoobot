import Command from '../structures/commandInterface';
import CommandParser from '../structures/commandParser';
import { betterSend } from "../discordUtility/messageMan";
import { Species, SpeciesObject } from '../models/species';
import { interactiveMessageHandler } from '..';
import { SpeciesEditMessage } from '../messages/speciesEditMessage';
import { SimpleEDoc } from '../structures/eDoc';

// The command used to review, edit, and approve a pending species into a real species
export class EditSpeciesCommand implements Command {
    public readonly commandNames = ['edit', 'editspecies'];

    public readonly adminOnly = true;

    public help(commandPrefix: string): string {
        return `Use \`${commandPrefix}edit\` \`<species name>\` to edit an existing species.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        const channel = parsedUserCommand.channel;
        
        // Interpret everything after the command as the name of the species to edit
        const fullSearchTerm = parsedUserCommand.fullArguments.toLowerCase();

        if (!fullSearchTerm) {
            betterSend(channel, this.help(parsedUserCommand.displayPrefix));
            return;
        }

        // Get a species whose first common name is the search term
        const species = await Species.findOne({ commonNamesLower: fullSearchTerm });

        // If nothing was found by that name
        if (!species) {
            betterSend(channel, `No species with the common name '${fullSearchTerm}' could be found.`);
            return;
        }

        // Create and load a species object representing the target species
        const speciesObject = new SpeciesObject({ document: species });
        await speciesObject.load();

        // Create a new species edit message from the species object and send it
        const editMessage = new SpeciesEditMessage(interactiveMessageHandler, channel, speciesObject);
        editMessage.send();

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
            console.log(finalDocument);
        });
    }
}