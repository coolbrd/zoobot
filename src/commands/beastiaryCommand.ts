import { interactiveMessageHandler } from "..";
import BeastiaryMessage from "../messages/beastiaryMessage";
import Command from "../structures/commandInterface";
import CommandParser from "../structures/commandParser";
import { errorHandler } from "../structures/errorHandler";

export default class BeastiaryCommand implements Command {
    public readonly commandNames = ['beastiary', 'bestiary', 'b'];

    public help(displayPrefix: string): string {
        return `Use \`${displayPrefix}beastiary\` to view a list of every collectible species.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        const beastiaryMessage = new BeastiaryMessage(interactiveMessageHandler, parsedUserCommand.channel);
        try {
            await beastiaryMessage.send();
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error sending a beastiary message.');
            return;
        }
    }
}