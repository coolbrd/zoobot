import Command from "../structures/commandInterface";
import CommandParser from "../structures/commandParser";
import InventoryMessage from "../messages/inventoryMessage";
import { interactiveMessageHandler } from "..";
import { betterSend } from "../discordUtility/messageMan";
import { errorHandler } from "../structures/errorHandler";

export default class ViewInventoryCommand implements Command {
    commandNames = ['inventory', 'inv', 'vi'];

    public help(commandPrefix: string): string {
        return `Use \`${commandPrefix}inv\` to see a list of all your captured animals.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        // Don't run the command if it's in DMs
        if (parsedUserCommand.channel.type === 'dm') {
            betterSend(parsedUserCommand.channel, 'The inventory command can only be used in servers.');
            return;
        }

        const inventoryMessage = new InventoryMessage(interactiveMessageHandler, parsedUserCommand.channel, parsedUserCommand.originalMessage.author);
        try {
            await inventoryMessage.send();
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error sending a user inventory message.');
        }
    }
}