import { Document } from 'mongoose';

import Command from '../structures/CommandInterface';
import CommandParser from '../structures/CommandParser';
import { PendingSpeciesModel, PendingSpecies } from '../models/PendingSpecies';
import { betterSend } from "../discordUtility/messageMan";
import { commonNamesToLower, CommonNameTemplate, SpeciesModel } from '../models/Species';
import SpeciesApprovalMessage from '../messages/SpeciesApprovalMessage';
import { SimpleEDoc } from '../structures/EDoc';
import { errorHandler } from '../structures/ErrorHandler';

// The command used to review, edit, and approve a pending species into a real species
export default class ApprovePendingSpeciesCommand implements Command {
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

        let pendingSpeciesDocument: Document | null;
        // Get a pending species whose first common name is the search term
        try {
            pendingSpeciesDocument = await PendingSpeciesModel.findOne({ commonNamesLower: fullSearchTerm });
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error trying to find a pending species document in the database.');
            return;
        }

        // If nothing was found by that name
        if (!pendingSpeciesDocument) {
            betterSend(channel, `No pending species submission with the common name '${fullSearchTerm}' could be found.`);
            return;
        }

        // Create a new pending species object from the found document
        const pendingSpeciesObject = new PendingSpecies(pendingSpeciesDocument._id);
        await pendingSpeciesObject.load();

        // Create a new approval message from the object and send it
        const approvalMessage = new SpeciesApprovalMessage(channel, pendingSpeciesObject);

        try {
            await approvalMessage.send();
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error attempting to send a species approval message.');
            return;
        }

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
            const speciesDocument = new SpeciesModel(finalDocument);

            // Get common names and their lowercase array form
            const commonNames = finalDocument['commonNames'] as unknown as CommonNameTemplate[];
            const commonNamesLower = commonNamesToLower(commonNames);
            
            // Assign lowercase common names
            speciesDocument.set('commonNamesLower', commonNamesLower);

            // Save the new species
            speciesDocument.save().then(() => {
                betterSend(channel, 'Species approved.');

                // Delete the pending species
                pendingSpeciesObject.delete().catch(error => {
                    errorHandler.handleError(error, 'There was an error attempting to delete a newly approved pending species from the database.');
                });
            }).catch(error => {
                errorHandler.handleError(error, 'There was an error attempting to save a newly approved species to the database.');
            });
        });
    }
}