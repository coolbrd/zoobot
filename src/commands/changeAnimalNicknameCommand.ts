import { getGuildMember } from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import { AnimalObject } from "../models/animal";
import Command from "../structures/commandInterface";
import CommandParser from "../structures/commandParser";
import { getAnimalByInventoryPosition, getPlayerObject, searchAnimal } from "../zoo/userManagement";

// Changes a user's animal's nickname
export class ChangeAnimalNicknameCommand implements Command {
    public readonly commandNames = ['nickname', 'nick', 'nn'];

    public help(prefix: string): string {
        return `Use ${prefix}nickname <animal identifier> to change the nickname of an animal in your collection.`;
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

        // The string representing the animal the change the nickname of
        const animalIdentifier = parsedUserCommand.args[0];
        // Convert the identifier string into a number
        const animalNumber = Number(animalIdentifier);

        // If the user provided a non-number identifier
        if (isNaN(animalNumber)) {
            betterSend(parsedUserCommand.channel, 'You need to specify the animal\'s numeric identifier (the number next to the animal\'s place in your inventory).');
            return;
        }

        // Get the player object that represents the player changing the nickname
        const playerObject = await getPlayerObject(getGuildMember(parsedUserCommand.originalMessage.author, parsedUserCommand.channel.guild));

        // Get the animal at the player's given inventory position
        const animalObject = await getAnimalByInventoryPosition(playerObject, animalNumber - 1);

        if (!animalObject) {
            betterSend(parsedUserCommand.channel, 'No animal in your inventory with that number exists.');
            return;
        }

        // The nickname string that will be used
        let newNickname: string | null;
        // If the user didn't provide a nickname to use
        if (parsedUserCommand.args.length < 2) {
            // Set the animal's nickname as an empty string, resetting it
            newNickname = null;
        }
        // If the user specified a nickname
        else {
            // Get all text following the animal identifier
            const args = parsedUserCommand.fullArguments;
            newNickname = args.slice(args.indexOf(animalIdentifier) + animalIdentifier.length, args.length).trim();
        }
        // Change the animal's nickname to the determined string
        await animalObject.setNickname(newNickname);

        // Indicate that the command was performed successfully
        parsedUserCommand.originalMessage.react('✅');
    }
}