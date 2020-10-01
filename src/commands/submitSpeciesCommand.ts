import { stripIndents } from 'common-tags';
import { MessageEmbed, APIMessage } from 'discord.js';

import Command from '../structures/commandInterface';
import CommandParser from '../structures/commandParser';
import { betterSend, safeDeleteMessage } from "../discordUtility/messageMan";
import { PendingSpecies } from '../models/pendingSpecies';
import { interactiveMessageHandler } from '..';
import { reactionInput } from '../discordUtility/reactionInput';
import { arrayToLowerCase } from '../utility/arraysAndSuch';
import { EDoc, SimpleEDoc } from '../structures/eDoc';
import EDocMessage from '../messages/eDocMessage';

// Initiates the species submission process. Only to be used in DMs.
export class SubmitSpeciesCommand implements Command {
    public commandNames = ['submitspecies', 'submit'];

    public help(commandPrefix: string): string {
        return `Use \`${commandPrefix}submit\` to begin the species submission process.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
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
            betterSend(channel, 'Your time to initiate the previous submission process has expired. Perform the submit command again to try again.');
            return;
        }
        // If we're out here that means the button was pressed

        // Attempt to delete the info message
        safeDeleteMessage(infoMessage);

        // The eDoc containing all field information regarding the new submission
        const submissionDocument = new EDoc({
            commonNames: {
                type: [{
                    type: String,
                    alias: 'common name',
                    stringOptions: {
                        maxLength: 96
                    }
                }],
                required: true,
                alias: 'common names',
                prompt: 'Enter a name that is used to refer to this animal conversationally (e.g. "dog", "cat", "bottlenose dolphin"):',
            },
            scientificName: {
                type: String,
                required: true,
                alias: 'scientific name',
                prompt: 'Enter this animal\'s scientific (taxonomical) name:',
                stringOptions: {
                    maxLength: 128
                }
            },
            images: {
                type: [{
                    type: String,
                    alias: 'url',
                    stringOptions: {
                        maxLength: 128
                    }
                }],
                alias: 'images',
                prompt: 'Enter a valid imgur link to a clear picture of the animal. Must be a direct link to the image (e.g. "i.imgur.com/fake-image"):'
            },
            description: {
                type: String,
                alias: 'description',
                prompt: 'Enter a concise description of the animal (see other animals for examples):',
                stringOptions: {
                    maxLength: 512
                }
            },
            naturalHabitat: {
                type: String,
                alias: 'natural habitat',
                prompt: 'Enter a concise summary of where the animal is naturally found (see other animals for examples):',
                stringOptions: {
                    maxLength: 512
                }
            },
            wikiPage: {
                type: String,
                alias: 'Wikipedia page',
                prompt: 'Enter the link that leads to this animal\'s page on Wikipedia:',
                stringOptions: {
                    maxLength: 256
                }
            }
        });

        // Create and send the submission message
        const submissionMessage = new EDocMessage(interactiveMessageHandler, channel, submissionDocument, 'new submission');
        await submissionMessage.send();

        // When the message reaches its time limit
        submissionMessage.once('timeExpired', () => {
            betterSend(channel, 'Time limit expired, nothing submitted.');
        });
        
        // When the user presses the exit button
        submissionMessage.once('exit', () => {
            betterSend(channel, 'Submission cancelled.');
        });

        // When the user presses the submit button
        submissionMessage.once('submit', (finalDocument: SimpleEDoc) => {
            const pendingSpecies = new PendingSpecies();

            // Assign fields
            pendingSpecies.set('commonNames', finalDocument['commonNames']);
            pendingSpecies.set('scientificName', finalDocument['scientificName']);
            pendingSpecies.set('images', finalDocument['images']);
            pendingSpecies.set('description', finalDocument['description']);
            pendingSpecies.set('naturalHabitat', finalDocument['naturalHabitat']);
            pendingSpecies.set('wikiPage', finalDocument['wikiPage']);

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