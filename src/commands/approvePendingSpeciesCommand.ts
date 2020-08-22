import { TextChannel } from 'discord.js';

import Command from './commandInterface';
import CommandParser from '../utility/commandParser';
import { PendingSpecies } from '../models/pendingSpecies';
import { betterSend } from '../utility/toolbox';
import EditableDocumentMessage from '../messages/editableDocumentMessage';
import { speciesFieldInfo } from '../models/species';

export class ApprovePendingSpeciesCommand implements Command {
    readonly commandNames = ['approve', 'approvespecies'];

    help(commandPrefix: string): string {
        return `Use ${commandPrefix}approve to begin the process of reviewing and approving a species submission.`;
    }

    async run(parsedUserCommand: CommandParser): Promise<void> {
        const channel = parsedUserCommand.originalMessage.channel as TextChannel;
        
        const fullSearchTerm = parsedUserCommand.args.join(' ');

        const searchResult = await PendingSpecies.findOne({ 'commonNames.0': fullSearchTerm });

        if (!searchResult) {
            betterSend(channel, `No pending species submission with the common name '${fullSearchTerm}' could be found.`);
            return;
        }

        const pendingSubmission = searchResult.toObject();

        const editableDocument = {};
        for (const key of Object.keys(speciesFieldInfo)) {
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
    }
}