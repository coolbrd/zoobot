import { UserResolvable, GuildResolvable, TextChannel, Message, MessageReaction, User } from 'discord.js';
import { client } from '..';

// Does pretty much what you'd expect it to
export function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Gets a user's display color in a given guild
export function getGuildUserDisplayColor(userResolvable: UserResolvable, guildResolvable: GuildResolvable) {
    const guild = client.guilds.resolve(guildResolvable);
    if (!guild) {
        throw new Error(`Attempted to get the display color of a user from a guild that could not be resolved.`);
    }

    const guildMember = guild.member(userResolvable)
    if (!guildMember) {
        throw new Error(`Attempted to get the display color of a user that could not be resolved.`);
    }

    return guildMember.displayColor;
}

// Adds a reaction to a message and waits for a user to press the reaction.
//Returns true if the button was pressed, and false if the timeout limit is reached.
export async function pressAndGo(message: Message, timeOut: number, emojiString: string) {
    await message.react(emojiString);

    // The filter used to determine a valid button press
    const reactionCollectorFilter = (reaction: MessageReaction, user: User) => {
        return !user.bot && reaction.emoji.name === emojiString;
    };
    // Options that tell the collector to wait for only one reaction, and to expire after the time limit has been reached
    const reactionCollectorOptions = { max: 1, time: timeOut, errors: ['time'] };

    // Wait for someone to react to the message
    let collectedReactions;
    try {
        collectedReactions = await message.awaitReactions(reactionCollectorFilter, reactionCollectorOptions);
    }
    // If the timer expires before anybody reacts
    catch {
        return false;
    }
    // If this point is reached, a reaction was added

    return true;
}

// Sends a message in a channel, but has generic error handling so it doesn't have to be repeated 1,000,000 times throughout code.
export async function betterSend(channel: TextChannel, content: string) {
    try {
        return await channel.send(content);
    }
    catch (error) {
        console.error(`Error trying to send message in channel ${channel.id}.`, error);
        return;
    }
}