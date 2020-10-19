import BeastiaryMessage from "../messages/BeastiaryMessage";
import Command from "../structures/Command";
import CommandParser from "../structures/CommandParser";

// Sends a message listing all the species in the Beastiary
export default class BeastiaryCommand implements Command {
    public readonly commandNames = ["beastiary", "bestiary", "b"];

    public readonly info = "View the list of all species available in The Beastiary";

    public help(displayPrefix: string): string {
        return `Use \`${displayPrefix}${this.commandNames[0]}\` to view a list of every collectible species.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        // Create and send a Beastiary message
        const beastiaryMessage = new BeastiaryMessage(parsedUserCommand.channel, parsedUserCommand.originalMessage.author);
        try {
            await beastiaryMessage.send();
        }
        catch (error) {
            throw new Error(`There was an error sending a beastiary message: ${error}`);
        }
    }
}