import BeastiaryMessage from "../messages/BeastiaryMessage";
import Command from "../structures/CommandInterface";
import CommandParser from "../structures/CommandParser";

export default class BeastiaryCommand implements Command {
    public readonly commandNames = ["beastiary", "bestiary", "b"];

    public help(displayPrefix: string): string {
        return `Use \`${displayPrefix}beastiary\` to view a list of every collectible species.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        const beastiaryMessage = new BeastiaryMessage(parsedUserCommand.channel, parsedUserCommand.originalMessage.author);
        try {
            await beastiaryMessage.send();
        }
        catch (error) {
            throw new Error(`There was an error sending a beastiary message: ${error}`);
        }
    }
}