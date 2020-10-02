import Command from '../structures/commandInterface';
import CommandParser from '../structures/commandParser';
import { PendingSpecies, PendingSpeciesObject } from '../models/pendingSpecies';
import { betterSend } from "../discordUtility/messageMan";
import { SimpleDocument } from '../structures/editableDocument';
import { CommonNameFieldsTemplate, Species } from '../models/species';
import { SpeciesApprovalMessage } from '../messages/speciesApprovalMessage';
import { interactiveMessageHandler } from '..';
import { arrayToLowerCase } from '../utility/arraysAndSuch';
import { SimpleEDoc, SimpleEDocValue } from '../structures/eDoc';

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

        const pendingSpeciesObject = new PendingSpeciesObject({ document: pendingSpeciesDocument });

        // Create a new approval message from the found document and send it
        const approvalMessage = new SpeciesApprovalMessage(interactiveMessageHandler, channel, pendingSpeciesObject);
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
        approvalMessage.once('submit', (finalDocument: SimpleEDoc) => {
            const speciesDocument = new Species();

            // Get the array of common name objects from the final document
            const commonNames = finalDocument['commonNames'] as SimpleEDoc[];
            // The array that will contain lowercase forms of all the common names
            const commonNamesLower: string[] = [];
            // Add each name's lowercase form to the list
            commonNames.forEach(commonName => {
                commonNamesLower.push((commonName['name'] as string).toLowerCase());
            });
            
            // Assign fields
            speciesDocument.set('commonNames', commonNames);
            speciesDocument.set('commonNamesLower', commonNamesLower);
            speciesDocument.set('scientificName', finalDocument['scientificName']);
            speciesDocument.set('images', finalDocument['images']);
            speciesDocument.set('description', finalDocument['description']);
            speciesDocument.set('naturalHabitat', finalDocument['naturalHabitat']);
            speciesDocument.set('wikiPage', finalDocument['wikiPage']);
            speciesDocument.set('rarity', finalDocument['rarity']);

            // Save the new species
            speciesDocument.save();

            // Delete the pending species
            pendingSpeciesObject.delete();

            betterSend(channel, 'Species approved.');
        });
    }
}