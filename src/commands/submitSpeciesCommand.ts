import Command from './commandInterface';
import CommandParser from '../utility/commandParser';
import { Message, MessageReaction, User } from 'discord.js';
import { stripIndents } from 'common-tags';
import { capitalizeFirstLetter } from '../utility/toolbox';

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

async function pressAndGo(message: Message, timeOut: number, emojiString: string) {
    await message.react('👍');

    const reactionCollectorFilter = (reaction: MessageReaction, user: User) => {
        return !user.bot && reaction.emoji.name === emojiString;
    };
    const reactionCollectorOptions = { max: 1, time: timeOut, errors: ['time'] };

    let collectedReactions;
    try {
        collectedReactions = await message.awaitReactions(reactionCollectorFilter, reactionCollectorOptions);
    }
    catch {
        return false;
    }

    return true;
}

export class SubmitSpeciesCommand implements Command {
    commandNames = [`submitspecies`, `submit`];

    help(commandPrefix: string): string {
        return `Use ${commandPrefix}submit to begin the species submission process.`;
    }

    async run(parsedUserCommand: CommandParser) {
        const channel = parsedUserCommand.originalMessage.channel;

        const initialMessage = await channel.send(stripIndents`
            You are about to begin the process of submitting a new animal species to The Beastiary.
            Please read over the following fields and prepare your submissions for them in advance.
            
            1) Common name(s): The names used to refer to the animal in everyday speech. E.g. "raven", "bottlenose dolphin". **At least one is required.**
            2) Image(s): Pictures used to clearly depict the animal's appearance. Imgur links only. **At least one is required.**
            3) Scientific name: The taxonomical name of the animal. If the animal's common name refers to multiple species, pick the most relevant one. **Required.**
            4) Description: A brief description of the animal's appearance, attributes, and behaviors. **Not required.**
            5) Natural habitat: A brief description of the animal's natural environment, both in ecological traits and geographic location. **Not required.**
            6) Wikipedia page: The link to the animal's species' wikipedia page. **Not required.**

            Press the reaction button to initiate the submission process when you're ready.
        `);

        if (!(await pressAndGo(initialMessage, 60000, '👍'))) {
            await channel.send(`Your time to initiate the previous submission process has expired. Perform the submit command again if you wish try again.`);
            return;
        }

        try {
            await channel.send(stripIndents`
                Submission process initiated. You will have 60 seconds to respond to each individual prompt. Pre-writing these answers in another document and copying them over is highly recommended.
            `);
        }
        catch (error) {
            console.error(`Error trying to send a message during initiation of species submission process.`, error);
            return;
        }

        const messageCollectorFilter = (response: Message) => {
            return response.author === parsedUserCommand.originalMessage.author;
        };
        const messageCollectorOptions = { max: 1, time: 60000, errors: [`time`] };

        let fieldCounter = 0;
        for await (const field of Object.values(speciesSubmission)) {
            fieldCounter++;

            let currentEntry: string[] = [];

            try {
                await channel.send(stripIndents`
                    Field ${fieldCounter}: **${capitalizeFirstLetter(field.prompt)}${field.multiple ? `(s)` : ``}**:
                    ${field.info}:
                `);
            }
            catch (error) {
                console.error(`Error trying to send a DM message during animal submission.`, error);
                return;
            }

            while (true) {
                if (currentEntry.length > 0) {
                    try {
                        await channel.send(`Enter another ${field.prompt}, or enter "next" to continue to the next field:`);
                    }
                    catch (error) {
                        console.error(`Error trying to send a DM message during animal submission.`, error);
                        return;
                    }
                }
                
                let userResponse;
                try {
                    userResponse = await channel.awaitMessages(messageCollectorFilter, messageCollectorOptions);
                }
                catch {
                    try {
                        await channel.send(`Time limit expired, submission aborted.`);
                    }
                    catch (error) {
                        console.error(`Error trying to send a message after no messages were collected for a submission command.`, error);
                    }
                    return;
                }

                if (!userResponse) {
                    throw new Error(`User response object returned from message collector is undefined.`);
                }

                const responseMessage = userResponse.first();
                if (!responseMessage) {
                    throw new Error(`Message collector came back empty.`);
                }

                const response = responseMessage.content;

                if (response.trim().toLowerCase() === "next") {
                    break;
                }

                currentEntry.push(responseMessage.content);

                if (!field.multiple) {
                    break;
                }
            }
        }
    }
}