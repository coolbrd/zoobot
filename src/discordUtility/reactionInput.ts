import { Message, MessageReaction, User } from 'discord.js';

// Adds reactions to a message and waits for a user to press one of them
// Returns the string of the button that gets pressed, and undefined if none are pressed
export async function reactionInput(message: Message, timeOut: number, emojis: string[]): Promise<string | undefined> {
    try {
        // Add all reactions
        for (const emoji of emojis) {
            await message.react(emoji);
        }
    }
    catch (error) {
        console.error('There was an error reacting to a message in reactionInput.');
        throw new Error(error);
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
        throw new Error('reactionInput collected a reaction but returned an undefined collection.');
    }

    const emojiReaction = userReaction.first();

    if (!emojiReaction) {
        throw new Error('reactionInput returned an empty collection.');
    }

    return emojiReaction.emoji.name;
}
