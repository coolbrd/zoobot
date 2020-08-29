import Command from './commandInterface';
import CommandParser from '../utility/commandParser';
import { PendingSpecies } from '../models/pendingSpecies';
import { betterSend } from '../utility/toolbox';
import EditableDocumentMessage from '../messages/editableDocumentMessage';
import EditableDocument, { EditableDocumentSkeleton } from '../utility/editableDocument';
import { Document } from 'mongoose';

// The command used to review, edit, and approve a pending species into a real species
export class ApprovePendingSpeciesCommand implements Command {
    public readonly commandNames = ['approve', 'approvespecies'];

    public help(commandPrefix: string): string {
        return `Use ${commandPrefix}approve to begin the process of reviewing and approving a species submission.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        const channel = parsedUserCommand.channel;
        
        // Interpret everything after the command as the name of the species for approval
        const fullSearchTerm = parsedUserCommand.args.join(' ');

        // Get a pending species whose first common name is the search term
        const pendingSpecies = await PendingSpecies.findOne({ 'commonNames.0': fullSearchTerm });

        // If nothing was found by that name
        if (!pendingSpecies) {
            betterSend(channel, `No pending species submission with the common name '${fullSearchTerm}' could be found.`);
            return;
        }

        // Get the pending submission as a plain object
        const pendingSubmission = pendingSpecies.toObject();

        // Create and send a message containing the editable document of information compiled
        //const editableDocumentMessage = new EditableDocumentMessage(channel, new EditableDocument(document));
        //editableDocumentMessage.send();
    }
}