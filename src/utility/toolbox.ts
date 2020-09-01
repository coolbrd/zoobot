import { UserResolvable, GuildResolvable, TextChannel, Message, MessageReaction, User, DMChannel, APIMessage } from 'discord.js';

import { client } from '..';

// Does pretty much what you'd expect it to
export function capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Gets a user's display color in a given guild
export function getGuildUserDisplayColor(userResolvable: UserResolvable, guildResolvable: GuildResolvable): number {
    const guild = client.guilds.resolve(guildResolvable);
    if (!guild) {
        throw new Error('Attempted to get the display color of a user from a guild that could not be resolved.');
    }

    const guildMember = guild.member(userResolvable);
    if (!guildMember) {
        throw new Error('Attempted to get the display color of a user that could not be resolved.');
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
        console.error('pressAndGo collected a reaction but returned an undefined collection.');
        return;
    }

    const emojiReaction = userReaction.first();

    if (!emojiReaction) {
        console.error('pressAndGo returned an empty collection.');
        return;
    }

    return emojiReaction.emoji.name;
}

export async function awaitUserNextMessage(channel: TextChannel | DMChannel, user: User, timeout: number): Promise<Message | undefined> {
    // The filter that'll be used to select response messages
    const messageCollectorFilter = (response: Message) => {
        // Only accept a message from the given user
        return response.author === user;
    };
    // Options that force the collector to finish after one message, or after timeout
    const messageCollectorOptions = { max: 1, time: timeout, errors: ['time'] };

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
        throw new Error('A user\'s message was collected with awaitUserNextMessage, but the collector came back undefined.');
    }

    return userResponse.first();
}

// Sends a message in a channel, but has generic error handling so it doesn't have to be repeated 1,000,000 times throughout code.
export async function betterSend(channel: TextChannel | DMChannel, content: string | APIMessage, lifetime?: number): Promise<Message | undefined> {
    let message: Message;
    try {
        message = await channel.send(content);
    }
    catch (error) {
        console.error('Error trying to send message.', error);
        return;
    }

    // If a lifetime amount was given, try to delete the message eventually
    if (lifetime) {
        setTimeout(() => {
            safeDeleteMessage(message);
        }, lifetime);
    }

    return message;
}

// Joins an array by a given string, and uses comma separation by default if no delimiter is provided
export function safeArrayJoin(array: unknown[], delimiter?: string): string {
    return array.join(delimiter ? delimiter : ', ');
}

// Takes either a string value or an array of strings and converts it to a single string
export function joinIfArray(value: string | string[] | undefined, delimiter?: string): string | undefined {
    return Array.isArray(value) ? safeArrayJoin(value, delimiter) : value;
}

// Deletes a message if the bot is able to do that
export function safeDeleteMessage(message: Message | undefined): boolean {
    if (!message) {
        return false;
    }
    
    if (!message.deletable) {
        return false;
    }
    message.delete();
    return true;
}

// Selects a random item from a map of items and their respective weights
// Two items with the same weigh will have the same chance to be selected as one another
// An item with 10% the weight of another will, surprisingly, be selected 10% as often as the other item
export function getWeightedRandom<T>(items: Map<T, number>): T {
    // Calculate the cumulative weight of the item pool
    let totalWeight = 0;
    for (const weight of items.values()) {
        totalWeight += weight;
    }

    // Generate a random number that represents one of the items in the list
    const random = Math.random() * totalWeight;

    // The current sum of all weights
    let currentSum = 0;
    // Iterate over every item in the map
    for (const [item, weight] of items.entries()) {
        // If the random number falls within the range of the current item's weight
        if (random < currentSum + weight) {
            // Return the item, it's been chosen
            return item;
        }
        // If the current item wasn't selected, add its weight and move onto the next item
        currentSum += weight;
    }

    // This should never happen
    throw new Error('No item selected from weighted random function. This shouldn\'t happen');
}

// Get the number of occurrences of a given element in a given array
export function arrayElementCount<T>(array: T[], element: T): number {
    let count = 0;
    for (const current of array) {
        if (current === element) {
            count++;
        }
    }
    return count;
}