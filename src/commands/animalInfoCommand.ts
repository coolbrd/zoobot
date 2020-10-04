import { interactiveMessageHandler } from "..";
import { betterSend } from "../discordUtility/messageMan";
import AnimalInfoMessage from "../messages/animalInfoMessage";
import { AnimalObject } from "../models/animal";
import Command from "../structures/commandInterface";
import CommandParser from "../structures/commandParser";
import { errorHandler } from "../structures/errorHandler";
import { searchAnimal } from "../zoo/userManagement";

export default class AnimalInfoCommand implements Command {
    public readonly commandNames = ['animalinfo', 'ai', 'stats'];

    public help(prefix: string): string {
        return `Use \`${prefix}animalinfo\` \`<animal number or nickname>\` to view information about that animal.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        // Don't let this command be used in dms
        if (parsedUserCommand.channel.type === 'dm') {
            betterSend(parsedUserCommand.channel, 'This command can only be used in servers.');
            return;
        }

        // If the user provided no arguments
        if (parsedUserCommand.args.length < 1) {
            betterSend(parsedUserCommand.channel, this.help(parsedUserCommand.displayPrefix));
            return;
        }

        // The string representing the animal to get the info of
        const animalIdentifier = parsedUserCommand.fullArguments;

        let animalObject: AnimalObject | undefined;
        try {
            animalObject = await searchAnimal(animalIdentifier, {
                guildId: parsedUserCommand.channel.guild.id,
                userId: parsedUserCommand.originalMessage.author.id,
                searchByPosition: true 
            });
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error attempting to search an animal for the info command.');
            return;
        }

        if (!animalObject) {
            betterSend(parsedUserCommand.channel, 'No animal by that nickname/number could be found in this server.');
            return;
        }

        // Create and send an info message with the found animal object
        const infoMessage = new AnimalInfoMessage(interactiveMessageHandler, parsedUserCommand.channel, animalObject);
        infoMessage.send();
    }
}