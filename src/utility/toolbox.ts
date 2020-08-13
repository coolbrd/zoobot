import { UserResolvable, GuildResolvable, TextChannel, Message, MessageReaction, User, DMChannel, APIMessage, NewsChannel } from 'discord.js';

import { client } from '..';

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
export async function betterSend(channel: TextChannel | DMChannel | NewsChannel | User, content: string | APIMessage): Promise<Message | undefined> {
    try {
        return await channel.send(content);
    }
    catch (error) {
        console.error(`Error trying to send message.`, error);
        return;
    }
}