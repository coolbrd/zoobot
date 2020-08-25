import Command from './commandInterface';
import CommandParser from '../utility/commandParser';
import { PendingSpecies } from '../models/pendingSpecies';
import { betterSend } from '../utility/toolbox';
import EditableDocumentMessage from '../messages/editableDocumentMessage';
import Species, { speciesFieldInfo } from '../models/species';
import { EditableDocument } from '../utility/userInput';

export class ApprovePendingSpeciesCommand implements Command {
    public readonly commandNames = ['approve', 'approvespecies'];

    public help(commandPrefix: string): string {
        return `Use ${commandPrefix}approve to begin the process of reviewing and approving a species submission.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        const channel = parsedUserCommand.channel;
        
        const fullSearchTerm = parsedUserCommand.args.join(' ');

        const searchResult = await PendingSpecies.findOne({ 'commonNames.0': fullSearchTerm });

        if (!searchResult) {
            betterSend(channel, `No pending species submission with the common name '${fullSearchTerm}' could be found.`);
            return;
        }

        // Get the pending submission as a plain object
        const pendingSubmission = searchResult.toObject();

        // The document that will be used to edit and finalize the pending submission
        const editableDocument: EditableDocument = {};
        // Iterate over every field name that a species needs
        for (const key of Object.keys(speciesFieldInfo)) {
            // Add a field to the document that contains the required field names mapped to the given information
            Object.defineProperty(editableDocument, key, {
                value: {
                    fieldInfo: speciesFieldInfo[key],
                    value: pendingSubmission[key]
                },
                enumerable: true,
                writable: false
            });
        }

        const editableDocumentMessage = new EditableDocumentMessage(channel, editableDocument);
        editableDocumentMessage.send();
        
        for (;;) {
            const submission = await editableDocumentMessage.getNextSubmission();

            if (!submission) {
                betterSend(channel, 'Time limit expired, approval process aborted.');
                return;
            }

            const speciesDocument = new Species();
            let requirementsMet = true;
            for (const [key, field] of Object.entries(submission)) {
                if (!field.value || (field.fieldInfo.multiple && field.value.length < 1)) {
                    betterSend(channel, `Field '${field.fieldInfo.alias}' is missing. Add it and try again.`);
                    requirementsMet = false;
                    break;
                }

                speciesDocument.set(key, field.value);
            }
            if (!requirementsMet) {
                continue;
            }

            speciesDocument.save();
            break;
        }

        betterSend(channel, 'Submission approved!');
    }
}