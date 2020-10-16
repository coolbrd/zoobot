import Command from "../structures/Command";
import CommandParser from "../structures/CommandParser";
import CollectionMessage from "../messages/CollectionMessage";
import { betterSend } from "../discordUtility/messageMan";

export default class ViewCollectionCommand implements Command {
    public readonly commandNames = ["collection", "col", "c"];

    public readonly info = "View your collection of animals"

    public help(commandPrefix: string): string {
        return `Use \`${commandPrefix}${this.commandNames[0]}\` to see your collection of captured animals.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        // Don't run the command if it's in DMs
        if (parsedUserCommand.channel.type === "dm") {
            betterSend(parsedUserCommand.channel, "The collection command can only be used in servers.");
            return;
        }

        const collectionMessage = new CollectionMessage(parsedUserCommand.channel, parsedUserCommand.originalMessage.author);
        try {
            await collectionMessage.send();
        }
        catch (error) {
            throw new Error(`There was an error sending a user collection message: ${error}`);
        }
    }
}