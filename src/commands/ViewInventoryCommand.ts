import Command from "../structures/Command";
import CommandParser from "../structures/CommandParser";
import InventoryMessage from "../messages/InventoryMessage";
import { betterSend } from "../discordUtility/messageMan";

export default class ViewInventoryCommand implements Command {
    public readonly commandNames = ["inventory", "inv", "vi"];

    public readonly info = "View your collection of animals"

    public help(commandPrefix: string): string {
        return `Use \`${commandPrefix}${this.commandNames[0]}\` to see a list of all your captured animals.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        // Don't run the command if it's in DMs
        if (parsedUserCommand.channel.type === "dm") {
            betterSend(parsedUserCommand.channel, "The inventory command can only be used in servers.");
            return;
        }

        const inventoryMessage = new InventoryMessage(parsedUserCommand.channel, parsedUserCommand.originalMessage.author);
        try {
            await inventoryMessage.send();
        }
        catch (error) {
            throw new Error(`There was an error sending a user inventory message: ${error}`);
        }
    }
}