import Command from './commandInterface';
import CommandParser from '../utility/commandParser';
import { PendingSpecies } from '../models/pendingSpecies';
import { betterSend } from '../utility/toolbox';
import EditableDocumentMessage from '../messages/editableDocumentMessage';
import Species, { speciesFieldInfo } from '../models/species';
import EditableDocument, { EditableDocumentSkeleton } from '../utility/editableDocument';

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

        const document: EditableDocumentSkeleton = {
            commonNames: {
                alias: 'common names',
                type: 'array',
                arrayType: 'string'
            },
            scientificName: {
                alias: 'scientific name',
                type: 'string'
            },
            images: {
                alias: 'images',
                type: 'array',
                arrayType: {
                    image: {
                        alias: 'url',
                        type: 'string'
                    },
                    breed: {
                        alias: 'breed',
                        type: 'string'
                    }
                }
            },
            cryptid: {
                alias: 'cryptid',
                type: 'boolean'
            }
        }

        // Create and send a message containing the editable document of information compiled
        const editableDocumentMessage = new EditableDocumentMessage(channel, new EditableDocument(document));
        editableDocumentMessage.send();
        
        /*
        // Loop until escaped
        for (;;) {
            // Wait until the user submits the species
            const submission = await editableDocumentMessage.getNextSubmission();

            // If the user ran out of time
            if (!submission) {
                betterSend(channel, 'Time limit expired, approval process aborted.');
                return;
            }

            // Initialize a new species document
            const speciesDocument = new Species();
            // Initially assume that all requirements of a species document have been met
            let requirementsMet = true;
            // Check every field in the submitted document for errors
            for (const [key, field] of Object.entries(submission)) {
                // If the field is undefined or an empty array
                if (!field.value || (field.fieldInfo.multiple && field.value.length < 1)) {
                    betterSend(channel, `Field '${field.fieldInfo.alias}' is missing. Add it and try again.`);
                    // Indicate that the submission is not complete
                    requirementsMet = false;
                    // Get the user's submission again
                    break;
                }
                
                // Set the non-empty field as the document's current field
                speciesDocument.set(key, field.value);
            }
            // If the document was marked as incomplete earlier in the loop
            if (!requirementsMet) {
                // Get the user's submission again
                continue;
            }
            // If we're down here, it means the requirements have been met

            speciesDocument.save();
            break;
        }

        betterSend(channel, 'Submission approved!');
        // Remove the pending species from the database
        pendingSpecies.remove();
        */
    }
}