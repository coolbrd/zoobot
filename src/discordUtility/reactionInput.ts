import { Message, MessageReaction, User } from "discord.js";

// Adds reactions to a message and waits for a user to press one of them
// Returns the string of the button that gets pressed, and undefined if none are pressed
export default async function reactionInput(message: Message, timeOut: number, emojis: string[]): Promise<string | undefined> {
    try {
        for (const emoji of emojis) {
            await message.react(emoji);
        }
    }
    catch (error) {
        throw new Error(`There was an error reacting to a message in reactionInput: ${error}`);
    }

    const reactionCollectorFilter = (reaction: MessageReaction, user: User) => {
        return !user.bot && emojis.includes(reaction.emoji.name);
    };
    const reactionCollectorOptions = { max: 1, time: timeOut, errors: ["time"] };

    let userReaction;
    try {
        userReaction = await message.awaitReactions(reactionCollectorFilter, reactionCollectorOptions);
    }
    // If the timer expires before anybody reacts
    catch {
        return;
    }

    if (!userReaction) {
        return;
    }

    const emojiReaction = userReaction.first();

    if (!emojiReaction) {
        return;
    }

    return emojiReaction.emoji.name;
}
