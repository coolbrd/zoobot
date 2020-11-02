import { TextChannel, Message, User, DMChannel } from "discord.js";

// Waits for a given user's next message and returns it
export default async function awaitUserNextMessage(channel: TextChannel | DMChannel, user: User, timeout: number): Promise<Message | undefined> {
    const messageCollectorFilter = (response: Message) => {
        return response.author === user;
    };
    const messageCollectorOptions = { max: 1, time: timeout, errors: ["time"] };

    let userResponse;
    try {
        userResponse = await channel.awaitMessages(messageCollectorFilter, messageCollectorOptions);
    }
    // If we enter this that means the user didn't provide an answer
    catch {
        return;
    }

    if (!userResponse) {
        return;
    }

    // Return the first (and only) message that met the given criteria
    return userResponse.first();
}
