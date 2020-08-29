import Command from './commandInterface';
import CommandParser from '../utility/commandParser';
import { PendingSpecies } from '../models/pendingSpecies';
import { betterSend } from '../utility/toolbox';
import EditableDocumentMessage from '../messages/editableDocumentMessage';
import EditableDocument, { schemaToSkeleton, EditableDocumentSkeletonValue } from '../utility/editableDocument';
import Species, { speciesSchema } from '../models/species';

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

        // Create the document skeleton for the approval document
        const approvalSkeleton = schemaToSkeleton(speciesSchema, {
            commonNames: {
                alias: 'common names'
            },
            scientificName: {
                alias: 'scientific name'
            },
            images: {
                alias: 'images',
                nestedInfo: {
                    url: {
                        alias: 'url'
                    },
                    breed: {
                        alias: 'breed'
                    }
                }
            },
            description: {
                alias: 'description'
            },
            naturalHabitat: {
                alias: 'natural habitat'
            },
            wikiPage: {
                alias: 'wikipedia page'
            },
            family: {
                alias: 'family'
            }
        });

        // Set known values that simply map to their pending species forms
        approvalSkeleton['commonNames'].value = pendingSpecies.get('commonNames');
        approvalSkeleton['scientificName'].value = pendingSpecies.get('scientificName');
        approvalSkeleton['description'].value = pendingSpecies.get('description');
        approvalSkeleton['naturalHabitat'].value = pendingSpecies.get('naturalHabitat');
        approvalSkeleton['wikiPage'].value = pendingSpecies.get('wikiPage');

        // Turn the images array into an array of objects that contain optional breed info
        const imageLinks: string[] = pendingSpecies.get('images');
        approvalSkeleton['images'].value = [] as EditableDocumentSkeletonValue[];
        for (const link of imageLinks) {
            approvalSkeleton['images'].value.push({
                url: link
            });
        }

        // Create and send a message containing the editable document of information compiled
        const editableDocumentMessage = new EditableDocumentMessage(channel, new EditableDocument(approvalSkeleton));
        editableDocumentMessage.send();

        // Get the final submission
        const finalDocument = await editableDocumentMessage.getNextSubmission();

        // Deactivate the approval message after submission
        editableDocumentMessage.deactivate();

        // If the message gets deactivated
        if (finalDocument === 'deactivated') {
            betterSend(channel, 'Time limit expired.');
            return;
        }
        // If the message is denied
        else if (finalDocument === 'cancelled') {
            // Delete the pending submission from the database
            pendingSpecies.deleteOne();
            betterSend(channel, 'Submission denied.');
            return;
        }

        // Create a species document from the output document
        const speciesDocument = new Species(finalDocument);
        // Save the new species
        speciesDocument.save();
        // Remove the pending species from the database
        pendingSpecies.deleteOne();

        betterSend(channel, 'Species approved.');
    }
}