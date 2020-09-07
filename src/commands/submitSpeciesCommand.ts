import { stripIndents } from 'common-tags';
import { MessageEmbed, APIMessage } from 'discord.js';

import Command from './commandInterface';
import CommandParser from '../utility/commandParser';
import { reactionInput, betterSend, safeDeleteMessage, arrayToLowerCase } from '../utility/toolbox';
import EditableDocumentMessage from '../messages/editableDocumentMessage';
import EditableDocument, { schemaToSkeleton, SimpleDocument } from '../utility/editableDocument';
import { PendingSpecies, pendingSpeciesSchema } from '../models/pendingSpecies';

// Initiates the species submission process. Only to be used in DMs.
export class SubmitSpeciesCommand implements Command {
    public commandNames = ['submitspecies', 'submit'];

    public help(commandPrefix: string): string {
        return `Use ${commandPrefix}submit to begin the species submission process. Only usable in DMs.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        // Cast the channel as a DMChannel or a TextChannel because that's what it is
        const channel = parsedUserCommand.channel;

        const user = parsedUserCommand.originalMessage.author;

        // Make a big instructional message so the user knows what they're signing themself up for
        const infoEmbed = new MessageEmbed();
        infoEmbed.setTitle('New species submission');
        infoEmbed.setDescription(stripIndents`
            You're about to begin the process of submitting a new animal species to The Beastiary.
            Please read over the following fields and prepare your submissions for them in advance.
        `);
        infoEmbed.addField('Common name(s)', 'The names used to refer to the animal in everyday speech. E.g. "raven", "bottlenose dolphin".\n**One required**');
        infoEmbed.addField('Scientific name', 'The taxonomical name of the animal. If the animal\'s common name refers to multiple species, pick the most relevant one.\n**Required**');
        infoEmbed.addField('Image(s)', 'Pictures used to clearly depict the animal\'s appearance. Direct Imgur links only, e.g. "i.imgur.com/fake-image".');
        infoEmbed.addField('Description', 'A brief description of the animal\'s appearance, attributes, and behaviors.');
        infoEmbed.addField('Natural habitat', 'A brief description of the animal\'s natural environment, both in ecological traits and geographic location.');
        infoEmbed.addField('Wikipedia page', 'The link to the animal\'s species\' wikipedia page.');
        infoEmbed.setFooter('Press the reaction button to initiate the submission process when you\'re ready.');

        const infoMessage = await betterSend(channel, new APIMessage(channel, { embed: infoEmbed }));

        // If the message didn't send for whatever reason just stop everything. Not sure why this would happen so throw an error I guess.
        if (!infoMessage) {
            throw new Error('Unable to send the initial species submission message to a user through DMs.');
        }

        // Make sure baby understands the game by making them press a cool confirmation button
        // There's also only a 60 second window to press the button so bonus burn if they have to send the command again
        if (!(await reactionInput(infoMessage, 60000, ['✅']))) {
            // If we're in here, the button didn't get pressed
            betterSend(channel, 'Your time to initiate the previous submission process has expired. Perform the submit command again if you wish try again.');
            return;
        }
        // If we're out here that means the button was pressed

        // Attempt to delete the info message
        safeDeleteMessage(infoMessage);

        // Combine the pending species schema and some info about it
        // This returns a skeleton, which is an awesome object that tells an EditableDocument how to act
        const skeleton = schemaToSkeleton(pendingSpeciesSchema, {
            commonNames: {
                alias: 'common names',
                prompt: 'Enter a name that is used to refer to this animal conversationally, e.g. "dog", "cat", "bottlenose dolphin".',
                maxLength: 96,
                arrayViewPortSize: 10
            },
            scientificName: {
                alias: 'scientific name',
                prompt: 'Enter this animal\'s scientific (taxonomical) name.',
                maxLength: 256
            },
            images: {
                alias: 'images',
                prompt: 'Enter a valid imgur link to a clear picture of the animal. Must be a direct link to the image, e.g. "i.imgur.com/fake-image"',
                maxLength: 128,
                arrayViewPortSize: 10
            },
            description: {
                alias: 'description',
                prompt: 'Enter a concise description of the animal. See other animals for examples.',
                maxLength: 1024
            },
            naturalHabitat: {
                alias: 'natural habitat',
                prompt: 'Enter a concise summary of where the animal is naturally found. See other animals for examples.',
                maxLength: 1024
            },
            wikiPage: {
                alias: 'wikipedia page',
                prompt: 'Enter the link leading to the Wikipedia page of the animal\'s species.',
                maxLength: 256
            }
        });

        const document = new EditableDocument(skeleton);

        // Create and send an editable document for the user's new species submission
        const submissionMessage = new EditableDocumentMessage(channel, document, 'new submission');
        submissionMessage.send();

        // When the message reaches its time limit
        submissionMessage.once('timeExpired', () => {
            betterSend(channel, 'Time limit expired, nothing submitted.');
        });
        
        // When the user presses the exit button
        submissionMessage.once('exit', () => {
            betterSend(channel, 'Submission cancelled.');
        });

        // When the user presses the submit button
        submissionMessage.once('submit', (finalDocument: SimpleDocument) => {
            // Create a new pending species based on the SimpleDocument that was returned
            // This works because SimpleDocument is just a plain object with the same field names as the Skeleton that was passed in
            const pendingSpecies = new PendingSpecies(finalDocument);

            // Assign case-normalized names
            pendingSpecies.set('commonNamesLower', arrayToLowerCase(pendingSpecies.get('commonNames')));

            // Set the author
            pendingSpecies.set('author', user.id);

            // Save the document
            pendingSpecies.save();

            betterSend(channel, 'Submission accepted. Thanks for contributing to The Beastiary!');
        });
    }
}