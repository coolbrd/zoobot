import { DMChannel, TextChannel } from 'discord.js';
import { stripIndents } from 'common-tags';

import Command from './commandInterface';
import CommandParser from '../utility/commandParser';
import { capitalizeFirstLetter, reactionInput, betterSend, awaitUserNextMessage } from '../utility/toolbox';
import { pendingSpeciesFields, PendingSpecies } from '../models/pendingSpecies';

// Initiates the species submission process. Only to be used in DMs.
export class SubmitSpeciesCommand implements Command {
    commandNames = [`submitspecies`, `submit`];

    help(commandPrefix: string): string {
        return `Use ${commandPrefix}submit to begin the species submission process. Only usable in DMs.`;
    }

    async run(parsedUserCommand: CommandParser): Promise<void> {
        // Cast the channel as a DMChannel or a TextChannel because that's what it is
        const channel = parsedUserCommand.originalMessage.channel as DMChannel | TextChannel;

        const user = parsedUserCommand.originalMessage.author;

        /*
        // If the message was sent in a guild channel and they don't know how much spam it would create
        if (channel.type === "text") {
            // Kindly inform the user of their misjudgement and open a DM chat with them to talk it out
            await betterSend(parsedUserCommand.originalMessage.author, `The submit command can get big. Use it in here and we can get started without annoying anybody.`);
            await betterSend(channel, `For cleanliness, the animal submission process is only done via direct messages. I've opened a chat with you so we can do this privately. ;)`);
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
            throw new Error(`Unable to send the initial species submission message to a user through DMs.`);
        }

        // Make sure baby understands the game by making them press a cool confirmation button
        // There's also only a 60 second window to press the button so bonus burn if they have to send the command again
        // This is necessary for reasons other than making the user feel dumb I promise
        if (!(await reactionInput(initialMessage, 60000, [`✅`]))) {
            // If we're in here, the button didn't get pressed
            await betterSend(channel, `Your time to initiate the previous submission process has expired. Perform the submit command again if you wish try again.`);
            return;
        }
        // If we're out here that means the button was pressed. They did good.
        
        // Tell the user that the big scary submission process has started
        await betterSend(channel, stripIndents`
            Submission process initiated. You will have 60 seconds to respond to each individual prompt.
            Pre-writing these answers in another document and copying them over is highly recommended.
        `);

        const responses = new Map<string, string | string[]>();
        let fieldCounter = 0;
        // Iterate over every field of the pending species schema
        // I'm not sure if for await is necessary or even appropriate here, but I typically just add async to anything and everything
        // If somebody reasonable is actually reading this and I'm making a big mistake, for the love of god please let me know
        for await (const [key, field] of Object.entries(pendingSpeciesFields)) {
            fieldCounter++;

            // The current list of entries given by the user for the current field. Single-response fields will just be an array with one element in them.
            const currentEntry: string[] = [];

            // Prompt the user for the current field
            await betterSend(channel, stripIndents`
                Field ${fieldCounter}: **${capitalizeFirstLetter(field.prompt)}${field.type === Array ? `(s)` : ``}**:
                ${field.info}:
            `);

            // Loop until forever comes
            // This is a wacky loop that ESLint insisted I use instead of while (true). Like it?
            for (;;) {
                // If this isn't the loop's first rodeo and we're not on the first entry of a multiple-response field anymore
                if (currentEntry.length > 0) {
                    // Let the user know that this is another entry for the same field
                    await betterSend(channel, `Enter another ${field.prompt}, or enter "next" to continue to the next field:`);
                }
                
                // Get the next message the user sends within 60 seconds
                const responseMessage = await awaitUserNextMessage(channel, user, 60000);

                // If the user didn't provide a response
                if (!responseMessage) {
                    // Time's up bucko
                    await betterSend(channel, `Time limit expired, submission aborted.`);

                    // Don't perform the rest of the operation
                    return;
                }

                // The actual string data of the user's response
                const response = responseMessage.content;

                // If the user in fact didn't want to respond, and would rather skip to the next field
                if (response.trim().toLowerCase() === "next") {
                    // If this field is both required an unsatisfied
                    if (field.required && currentEntry.length < 1) {
                        // Tell the user they're being very naughty
                        await betterSend(channel, `This field is required. You must input something at least once, try again.`);

                        // Repeat the loop and wait for a better response
                        continue;
                    }
                    // If we're down here, next is an acceptable response

                    // Break out of the forever loop and move on to the next field
                    break;
                }

                // Add the user's most recently submitted content to this field
                currentEntry.push(response);

                // If this field only requires one response
                if (field.type === String) {
                    // Break and move on to the next field
                    break;
                }
            }

            // Interpret the user's response as either a single string, or a string array, depending on the desired input type
            const finalEntry = field.type === String ? currentEntry[0] : currentEntry;

            // After input is all good and done, slot the (potentially empty) user response array into the composite array
            responses.set(key, finalEntry);
        }

        // Initialize the submission confirmation string
        let confirmString = `All fields satisfied. Please confirm or deny your inputs below.`;
        // Loop over every field in the pending species template, again
        for (const [key, field] of Object.entries(pendingSpeciesFields)) {
            // Append submitted information for every field, replacing undefined with less scary human text
            confirmString += `\n${capitalizeFirstLetter(field.prompt)}${field.type === Array ? `(s)` : ``}: ${responses.get(key) || `None provided`}`
        }

        const confirmSubmissionMessage = await betterSend(channel, confirmString);

        if (!confirmSubmissionMessage) {
            throw new Error(`Couldn't send species submission message.`);
        }

        // Wait for the user to confirm or deny their submission
        const buttonPress = await reactionInput(confirmSubmissionMessage, 60000, [`✅`, `❌`]);

        // Time's up!
        if (!buttonPress) {
            betterSend(channel, `Your time to submit this species has expired. Use the command again and input the same information to try again.`);
            return;
        }

        // If the user got cold feet and doesn't want to submit their work
        if (buttonPress === `❌`) {
            betterSend(channel, `Submission process aborted.`);
            return;
        }
        // If we're down here, the only possibility is that the check button was pressed

        // Construct the pending species document
        const pending = new PendingSpecies({
            commonNames: responses.get(`commonNames`),
            images: responses.get(`images`),
            scientificName: responses.get(`scientificName`),
            description: responses.get(`description`),
            naturalHabitat: responses.get(`naturalHabitat`),
            wikiPage: responses.get(`wikiPage`)
        });

        // Slap that submission into the database
        await pending.save();

        await betterSend(channel, `Submission sent! Your submission will be reviewed and edited before potentially being accepted. Thank you for contributing to The Beastiary!`);
    }
}