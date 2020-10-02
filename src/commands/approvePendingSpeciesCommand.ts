import Command from '../structures/commandInterface';
import CommandParser from '../structures/commandParser';
import { PendingSpecies, PendingSpeciesObject } from '../models/pendingSpecies';
import { betterSend } from "../discordUtility/messageMan";
import { CommonNameFieldsTemplate, commonNamesToLower, Species } from '../models/species';
import { SpeciesApprovalMessage } from '../messages/speciesApprovalMessage';
import { interactiveMessageHandler } from '..';
import { SimpleEDoc } from '../structures/eDoc';

// The command used to review, edit, and approve a pending species into a real species
export class ApprovePendingSpeciesCommand implements Command {
    public readonly commandNames = ['approve', 'approvespecies'];

    public readonly adminOnly = true;

    public help(commandPrefix: string): string {
        return `Use \`${commandPrefix}approve\` \`<pending species name>\` to begin the process of reviewing and approving a species submission.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        const channel = parsedUserCommand.channel;
        
        // Interpret everything after the command as the name of the species for approval
        const fullSearchTerm = parsedUserCommand.args.join(' ').toLowerCase();

        if (!fullSearchTerm) {
            betterSend(channel, this.help(parsedUserCommand.displayPrefix));
            return;
        }

        // Get a pending species whose first common name is the search term
        const pendingSpeciesDocument = await PendingSpecies.findOne({ commonNamesLower: fullSearchTerm });

        // If nothing was found by that name
        if (!pendingSpeciesDocument) {
            betterSend(channel, `No pending species submission with the common name '${fullSearchTerm}' could be found.`);
            return;
        }

        // Create a new pending species object from the found document
        const pendingSpeciesObject = new PendingSpeciesObject({ document: pendingSpeciesDocument });

        // Create a new approval message from the object and send it
        const approvalMessage = new SpeciesApprovalMessage(interactiveMessageHandler, channel, pendingSpeciesObject);
        await approvalMessage.send();

        // When the message's time limit is reached
        approvalMessage.once('timeExpired', () => {
            betterSend(channel, 'Time limit expired.');
        });

        // When the user presses the exit button
        approvalMessage.once('exit', () => {
            betterSend(channel, 'Approval process aborted.');
        });

        // When the user presses the deny button
        approvalMessage.once('deny', () => {
            betterSend(channel, 'Submission denied.');
        });

        // If the submission gets approved (submitted)
        approvalMessage.once('submit', (finalDocument: SimpleEDoc) => {
            // Create a new species from the final document
            const speciesDocument = new Species(finalDocument);

            // Get common names and their lowercase array form
            const commonNames = finalDocument['commonNames'] as unknown as CommonNameFieldsTemplate[];
            const commonNamesLower = commonNamesToLower(commonNames);
            
            // Assign lowercase common names
            speciesDocument.set('commonNamesLower', commonNamesLower);

            // Save the new species
            speciesDocument.save();
            // Delete the pending species
            pendingSpeciesObject.delete();

            betterSend(channel, 'Species approved.');
        });
    }
}