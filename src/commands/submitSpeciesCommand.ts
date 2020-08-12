import { Message, DMChannel, TextChannel } from 'discord.js';
import { stripIndents } from 'common-tags';

import Command from './commandInterface';
import CommandParser from '../utility/commandParser';
import { capitalizeFirstLetter, pressAndGo, betterSend } from '../utility/toolbox';

// Species submission command information for each stage of the process
const speciesSubmission = {
    commonNames: {
        required: true,
        multiple: true,
        prompt: `common name`,
        info: `Enter the animal's common name (e.g. "dog")`
    },
    images: {
        required: false,
        multiple: true,
        prompt: `image`,
        info: `Enter a direct imgur link to a clear image of the animal`
    },
    scientificName: {
        required: true,
        multiple: false,
        prompt: `scientific name`,
        info: `Enter the animal's scientific (taxonomical) name`
    },
    description: {
        required: false,
        multiple: false,
        prompt: `description`,
        info: `Enter a short description of the animal`
    },
    naturalHabitat: {
        required: false,
        multiple: false,
        prompt: `natural habitat`,
        info: `Enter a brief overview of the animal's natural habitat (see other animals for examples)`
    },
    wikiPage: {
        required: false,
        multiple: false,
        prompt: `Wikipedia page`,
        info: `Enter the link for the animal's species' Wikipedia page`
    }
}

// Initiates the species submission process. Only to be used in DMs.
export class SubmitSpeciesCommand implements Command {
    commandNames = [`submitspecies`, `submit`];

    help(commandPrefix: string): string {
        return `Use ${commandPrefix}submit to begin the species submission process. Only usable in DMs.`;
    }

    async run(parsedUserCommand: CommandParser): Promise<void> {
        // Cast the channel as a DMChannel or a TextChannel because that's what it is
        const channel = parsedUserCommand.originalMessage.channel as DMChannel | TextChannel;

        // If the message was sent in a guild channel and they don't know how much spam it would create
        if (channel.type === "text") {
            // Kindly inform the user of their misjudgement and open a DM chat with them to talk it out
            await betterSend(parsedUserCommand.originalMessage.author, `The submit command can get big. Use it in here and we can get started without annoying anybody.`);
            await betterSend(channel, `For cleanliness, the animal submission process is only done via direct messages. I've opened a chat with you so we can do this privately. ;)`);
            // Don't continue with the command and force them to initiate it again but in DMs. Might change but whatever
            return;
        }

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
        if (!(await pressAndGo(initialMessage, 60000, '👍'))) {
            // If we're in here, the button didn't get pressed
            await channel.send(`Your time to initiate the previous submission process has expired. Perform the submit command again if you wish try again.`);
            return;
        }
        // If we're out here that means the button was pressed. They did good.
        
        // Tell the user that the big scary submission process has started
        await betterSend(channel, stripIndents`
            Submission process initiated. You will have 60 seconds to respond to each individual prompt.
            Pre-writing these answers in another document and copying them over is highly recommended.
        `);

        // The filter that'll be used to select response messages
        // This could technically just return true because we want the first message from the user, but being sure won't hurt.
        const messageCollectorFilter = (response: Message) => {
            return response.author === parsedUserCommand.originalMessage.author;
        };
        // Options that force the collector to finish after one message, or 60 seconds
        const messageCollectorOptions = { max: 1, time: 60000, errors: [`time`] };

        const responses: string[][] = [];
        let fieldCounter = 0;
        // Iterate over every field in the submission template object
        // I'm not sure if for await is necessary or even appropriate here, but I typically just add async to anything and everything
        // If somebody reasonable is actually reading this and I'm making a big mistake, for the love of god please let me know
        for await (const field of Object.values(speciesSubmission)) {
            fieldCounter++;

            // Slap an empty array into the current position
            responses.push([]);

            // The current list of entries given by the user for the current field. Single-response fields will just be an array with one element in them.
            const currentEntry: string[] = [];

            // Prompt the user for the current field
            const promptMessage = await betterSend(channel, stripIndents`
                Field ${fieldCounter}: **${capitalizeFirstLetter(field.prompt)}${field.multiple ? `(s)` : ``}**:
                ${field.info}:
            `);

            // If for some cursed reason the prompt message couldn't send
            if (!promptMessage) {
                throw new Error(`Unable to send a prompt message during the species submission process.`);
            }

            // Loop until forever comes
            // This is a wacky loop that ESLint insisted I use instead of while (true). Like it?
            for (;;) {
                // If this isn't the loop's first rodeo and we're not on the first entry of a multiple-response field anymore
                if (currentEntry.length > 0) {
                    // Let the user know that this is another entry for the same field
                    const nextEntryMessage = await betterSend(channel, `Enter another ${field.prompt}, or enter "next" to continue to the next field:`);

                    // You know the drill
                    if (!nextEntryMessage) {
                        throw new Error(`Unable to send a multi-response follow-up message to a user through DMs.`);
                    }
                }
                
                // Initialize the user's response up here because I have to
                let userResponse;
                try {
                    // Wait for the user to respond to the given field's prompt
                    userResponse = await channel.awaitMessages(messageCollectorFilter, messageCollectorOptions);
                }
                // If we enter this that means the user didn't provide an answer
                catch {
                    // Time's up bucko
                    const timeLimitMessage = await betterSend(channel, `Time limit expired, submission aborted.`);

                    // I don't know how or when I'd ever see these error messages but I feel like I'd get bullied on stackoverflow for not including them
                    if (!timeLimitMessage) {
                        throw new Error(`Unable to send the time limit expiration message to a user through DMs.`);
                    }
                }
                // If we're out here that means the user responded to the prompt
                
                // If somehow the awaitMessages function collected a message but returned nothing, throw an even weirder error
                if (!userResponse) {
                    throw new Error(`User response object returned from message collector is undefined???`);
                }

                // Get the first message in a collection of the single message that the message collector returned
                const responseMessage = userResponse.first();
                // If somehow THIS is undefined...
                if (!responseMessage) {
                    throw new Error(`Message collector came back empty.`);
                }

                // Extract the user's response
                const response = responseMessage.content;

                // If the user in fact didn't want to respond, and would rather skip to the next field
                if (response.trim().toLowerCase() === "next") {
                    // If this field is both required an unsatisfied
                    if (field.required && currentEntry.length < 1) {
                        // Tell the user they're being very naughty
                        const rejectionMessage = await betterSend(channel, `This field is required. You must input something at least once, try again.`);

                        if (!rejectionMessage) {
                            throw new Error(`Unable to send the message telling the user to give required information through DMs.`);
                        }

                        // Repeat the loop and wait for a better response
                        continue;
                    }
                    // If we're down here, next is an acceptable response

                    // Break out of the forever loop and move on to the next field
                    break;
                }

                // Add the user's most recently submitted content to this field
                currentEntry.push(responseMessage.content);

                // If this field only requires one response
                if (!field.multiple) {
                    // Break and move on to the next field
                    break;
                }
            }

            // After input is all good and done, slot the (potentially empty) user response array into the composite array
            responses[fieldCounter] = currentEntry;
        }
    }
}