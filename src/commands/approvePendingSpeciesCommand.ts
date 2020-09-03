import Command from './commandInterface';
import CommandParser from '../utility/commandParser';
import { PendingSpecies } from '../models/pendingSpecies';
import { betterSend } from '../utility/toolbox';
import { SimpleDocument } from '../utility/editableDocument';
import { Species } from '../models/species';
import { SpeciesApprovalMessage } from '../messages/speciesApprovalMessage';

// The command used to review, edit, and approve a pending species into a real species
export class ApprovePendingSpeciesCommand implements Command {
    public readonly commandNames = ['approve', 'approvespecies'];

    public help(commandPrefix: string): string {
        return `Use ${commandPrefix}approve to begin the process of reviewing and approving a species submission.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        const channel = parsedUserCommand.channel;
        
        // Interpret everything after the command as the name of the species for approval
        const fullSearchTerm = parsedUserCommand.args.join(' ').toLowerCase();

        // Get a pending species whose first common name is the search term
        const pendingSpecies = await PendingSpecies.findOne({ 'commonNames.0': fullSearchTerm });

        // If nothing was found by that name
        if (!pendingSpecies) {
            betterSend(channel, `No pending species submission with the common name '${fullSearchTerm}' could be found.`);
            return;
        }

        // Create a new approval message from the found document and send it
        const approvalMessage = new SpeciesApprovalMessage(channel, pendingSpecies);
        approvalMessage.send();

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
        approvalMessage.once('submit', (finalDocument: SimpleDocument) => {
            // Create a species document from the output document
            const speciesDocument = new Species(finalDocument);
            // Save the new species
            speciesDocument.save();
            // Remove the pending species from the database
            pendingSpecies.deleteOne();

            betterSend(channel, 'Species approved.');
        });
    }
}