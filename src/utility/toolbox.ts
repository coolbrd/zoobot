import { UserResolvable, GuildResolvable, TextChannel, Message, MessageReaction, User, DMChannel, APIMessage, NewsChannel } from 'discord.js';
import { stripIndents } from 'common-tags';

import { client } from '..';
import { UserInputBundle } from '../models/userInput';

// Does pretty much what you'd expect it to
export function capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Gets a user's display color in a given guild
export function getGuildUserDisplayColor(userResolvable: UserResolvable, guildResolvable: GuildResolvable): number {
    const guild = client.guilds.resolve(guildResolvable);
    if (!guild) {
        throw new Error(`Attempted to get the display color of a user from a guild that could not be resolved.`);
    }

    const guildMember = guild.member(userResolvable);
    if (!guildMember) {
        throw new Error(`Attempted to get the display color of a user that could not be resolved.`);
    }

    return guildMember.displayColor;
}

// Adds reactions to a message and waits for a user to press one of them
// Returns the string of the button that gets pressed, and undefined if none are pressed
export async function reactionInput(message: Message, timeOut: number, emojis: string[]): Promise<string | undefined> {
    // Add all reactions
    for await (const emoji of emojis) {
        await message.react(emoji);
    }

    // The filter used to determine a valid button press
    const reactionCollectorFilter = (reaction: MessageReaction, user: User) => {
        // Make sure a user pressed one of the emojis from the list
        return !user.bot && emojis.includes(reaction.emoji.name);
    };
    // Options that tell the collector to wait for only one reaction, and to expire after the time limit has been reached
    const reactionCollectorOptions = { max: 1, time: timeOut, errors: ['time'] };

    let userReaction;
    // Wait for someone to react to the message
    try {
        userReaction = await message.awaitReactions(reactionCollectorFilter, reactionCollectorOptions);
    }
    // If the timer expires before anybody reacts
    catch {
        return;
    }
    // If this point is reached, a reaction was added

    if (!userReaction) {
        console.error(`pressAndGo collected a reaction but returned an undefined collection.`);
        return;
    }

    const emojiReaction = userReaction.first();

    if (!emojiReaction) {
        console.error(`pressAndGo returned an empty collection.`);
        return;
    }

    return emojiReaction.emoji.name;
}

export async function awaitUserNextMessage(channel: TextChannel | DMChannel | NewsChannel, user: User, timeout: number): Promise<Message | undefined> {
    // The filter that'll be used to select response messages
    const messageCollectorFilter = (response: Message) => {
        // Only accept a message from the given user
        return response.author === user;
    };
    // Options that force the collector to finish after one message, or after timeout
    const messageCollectorOptions = { max: 1, time: timeout, errors: [`time`] };

    // Initialize the user's response up here because I have to
    let userResponse;
    try {
        // Wait for the user to respond to the given field's prompt
        userResponse = await channel.awaitMessages(messageCollectorFilter, messageCollectorOptions);
    }
    // If we enter this that means the user didn't provide an answer
    catch {
        // Return undefined
        return;
    }
    // If we're out here that means the user responded to the prompt

    if (!userResponse) {
        console.error(`A user's message was collected with awaitUserNextMessage, but the collector came back undefined.`);
        return;
    }

    return userResponse.first();
}

// Sends a message in a channel, but has generic error handling so it doesn't have to be repeated 1,000,000 times throughout code.
export async function betterSend(channel: TextChannel | DMChannel | NewsChannel, content: string | APIMessage): Promise<Message | undefined> {
    try {
        return await channel.send(content);
    }
    catch (error) {
        console.error(`Error trying to send message.`, error);
        return;
    }
}

// Gets a set of inputs from the user according to a UserInputBundle
export async function getUserFieldInput(channel: TextChannel | DMChannel | NewsChannel, user: User, fields: UserInputBundle): Promise<Map<string, string | string[]> | undefined> {
    const responses = new Map<string, string | string[]>();
    let fieldCounter = 0;
    // Iterate over every field of the input bundle
    // I'm not sure if for await is necessary or even appropriate here, but I typically just add async to anything and everything
    // If somebody reasonable is actually reading this and I'm making a big mistake, for the love of god please let me know
    for await (const [key, field] of Object.entries(fields)) {
        fieldCounter++;

        // The current list of entries given by the user for the current field. Single-response fields will just be an array with one element in them.
        const currentEntry: string[] = [];

        // Prompt the user for the current field
        betterSend(channel, stripIndents`
            Field ${fieldCounter}: **${capitalizeFirstLetter(field.prompt)}${field.type === Array ? `(s)` : ``}**:
            ${field.info}:
        `);

        // Loop until forever comes
        // This is a wacky loop that ESLint insisted I use instead of while (true). Like it?
        for (;;) {
            // If this isn't the loop's first rodeo and we're not on the first entry of a multiple-response field anymore
            if (currentEntry.length > 0) {
                // Let the user know that this is another entry for the same field
                betterSend(channel, `Enter another ${field.prompt}, or enter "next" to continue to the next field:`);
            }
            
            // Get the next message the user sends within 60 seconds
            const responseMessage = await awaitUserNextMessage(channel, user, 60000);

            // If the user didn't provide a response
            if (!responseMessage) {
                // Time's up bucko
                // Maybe eventually replace this with a configurable message
                betterSend(channel, `Time limit expired, input process aborted.`);
                // Don't perform the rest of the operation and return undefined
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
    // If we're out here, that means the user has completed the input process

    // Return the completed set of responses
    return responses;
}