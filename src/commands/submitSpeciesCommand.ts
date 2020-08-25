import { stripIndents } from 'common-tags';
import { MessageEmbed, APIMessage } from 'discord.js';

import Command from './commandInterface';
import CommandParser from '../utility/commandParser';
import { capitalizeFirstLetter, reactionInput, betterSend, getUserFieldInput } from '../utility/toolbox';
import { pendingSpeciesUserInputBundle, PendingSpecies } from '../models/pendingSpecies';
import { UserInputResponses } from '../utility/userInput';

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

        /*
        // If the message was sent in a guild channel and they don't know how much spam it would create
        if (channel.type === 'text') {
            // Kindly inform the user of their misjudgement and open a DM chat with them to talk it out
            betterSend(parsedUserCommand.originalMessage.author, 'The submit command can get big. Use it in here and we can get started without annoying anybody.');
            betterSend(channel, 'For cleanliness, the animal submission process is only done via direct messages. I've opened a chat with you so we can do this privately. ;)');
            // Don't continue with the command and force them to initiate it again but in DMs. Might change but whatever
            return;
        }
        */

        // Send the big instructional message so the user knows what they're signing themselves up for
        const initialMessage = await betterSend(channel, stripIndents`
            You're about to begin the process of submitting a new animal species to The Beastiary.
            Please read over the following fields and prepare your submissions for them in advance.
            
            1) Common name(s): The names used to refer to the animal in everyday speech. E.g. "raven", "bottlenose dolphin". **At least one is required.**
            2) Image(s): Pictures used to clearly depict the animal's appearance. Imgur links only. **At least one is required.**
            3) Scientific name: The taxonomical name of the animal. If the animal's common name refers to multiple species, pick the most relevant one. **Required.**
            4) Description: A brief description of the animal's appearance, attributes, and behaviors. **Not required.**
            5) Natural habitat: A brief description of the animal's natural environment, both in ecological traits and geographic location. **Not required.**
            6) Wikipedia page: The link to the animal's species' wikipedia page. **Not required.**

            Press the reaction button to initiate the submission process when you're ready.
        `);

        // If the message didn't send for whatever reason just stop everything. Not sure why this would happen so throw an error I guess.
        if (!initialMessage) {
            throw new Error('Unable to send the initial species submission message to a user through DMs.');
        }

        // Make sure baby understands the game by making them press a cool confirmation button
        // There's also only a 60 second window to press the button so bonus burn if they have to send the command again
        // This is necessary for reasons other than making the user feel dumb I promise
        if (!(await reactionInput(initialMessage, 60000, ['✅']))) {
            // If we're in here, the button didn't get pressed
            betterSend(channel, 'Your time to initiate the previous submission process has expired. Perform the submit command again if you wish try again.');
            return;
        }
        // If we're out here that means the button was pressed. They did good.
        
        // Tell the user that the big scary submission process has started
        betterSend(channel, stripIndents`
            Submission process initiated. You will have 60 seconds to respond to each individual prompt.
            Pre-writing these answers in another document and copying them over is highly recommended.
        `);

        // Initialize the variable that will hold the user's responses to the various questions about the species they are submitting
        let responses: UserInputResponses | undefined;
        try {
            // Get the user's responses to the pending species fields
            responses = await getUserFieldInput(channel, user, pendingSpeciesUserInputBundle);
        }
        // If something goes wrong in the input gathering process
        catch (error) {
            console.error('Failed to get user input for pending species fields during submit command.', error);
            return;
        }

        // If the responses object comes back empty for some reason
        if (!responses) {
            throw new Error('Responses object from getUserFieldInput came back undefined.');
        }

        const confirmationEmbed = new MessageEmbed();
        confirmationEmbed.setDescription('All fields satisfied. Please confirm or deny your inputs below.');
        // Loop over every field in the pending species template
        for (const [key, field] of Object.entries(pendingSpeciesUserInputBundle)) {
            // Convert the currently iterated response to a pretty array string if it's an array
            const currentResponse = Array.isArray(responses[key]) ? (responses[key] as string[]).join(pendingSpeciesUserInputBundle[key].fieldInfo.delimiter || ', ') : responses[key];
            // Add the information to the confirmation embed
            confirmationEmbed.addField(`\n${capitalizeFirstLetter(field.fieldInfo.alias)}${field.fieldInfo.multiple ? '(s)' : ''}`, `${currentResponse || 'None provided'}`)
        }
        const confirmationMessage = await betterSend(channel, new APIMessage(channel, { embed: confirmationEmbed }));

        if (!confirmationMessage) {
            throw new Error('Couldn\'t send species submission message.');
        }

        // Wait for the user to confirm or deny their submission
        const buttonPress = await reactionInput(confirmationMessage, 60000, ['✅', '❌']);

        // Time's up!
        if (!buttonPress) {
            betterSend(channel, 'Your time to submit this species has expired. Use the command again and input the same information to try again.');
            return;
        }

        // If the user got cold feet and doesn't want to submit their work
        if (buttonPress === '❌') {
            betterSend(channel, 'Submission process aborted.');
            return;
        }
        // If we're down here, the only possibility is that the check button was pressed

        // Construct the pending species document with the previously arranged fields
        const pending = new PendingSpecies(responses);

        // Mark the document with their fingerprint so I know who the jokesters are
        pending.set('author', user.id);

        // Slap that submission into the database
        await pending.save();

        betterSend(channel, 'Submission sent! Your submission will be reviewed and edited before potentially being accepted. Thank you for contributing to The Beastiary!');
    }
}