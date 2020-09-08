import Command from "./commandInterface";
import CommandParser from "../utility/commandParser";
import { InventoryMessage } from "../messages/inventoryMessage";

export class ViewInventoryCommand implements Command {
    commandNames = ['inventory', 'inv', 'vi'];

    public help(commandPrefix: string): string {
        return `Use ${commandPrefix}inv to see a list of all your captured animals.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        const inventoryMessage = new InventoryMessage(parsedUserCommand.channel, parsedUserCommand.originalMessage.author);
        inventoryMessage.send();
    }
}