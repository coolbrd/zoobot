import { interactiveMessageHandler } from "..";
import { getGuildMember } from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import AnimalInfoMessage from "../messages/animalInfoMessage";
import { Animal, AnimalObject } from "../models/animal";
import Command from "../structures/commandInterface";
import CommandParser from "../structures/commandParser";
import { getAnimalByInventoryPosition, getPlayerObject } from "../zoo/userManagement";

export class AnimalInfoCommand implements Command {
    public readonly commandNames = ['animalinfo', 'ai', 'stats'];

    public help(prefix: string): string {
        return `Use ${prefix}animalinfo <animal number or nickname> to view information about that animal.`;
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

        // Attempt to first find the animal by its nickname (and guild)
        const animalDocument = await Animal.findOne({
            guildId: parsedUserCommand.channel.guild.id,
            $text: {
                $search: animalIdentifier
            }
        });

        let animalObject: AnimalObject;
        // If an animal was found by the given nickname
        if (animalDocument) {
            // Create a new object based on that animal
            animalObject = new AnimalObject({ document: animalDocument });
        }
        // If no animal with the given nickname was found
        else {
            // Interpret the identifier as a number
            const animalNumber = Number(animalIdentifier);

            // If the search term isn't a recognizable nickname or a number
            if (isNaN(animalNumber)) {
                betterSend(parsedUserCommand.channel, `No animal with the nickname '${animalIdentifier}' exists in this server.`);
                return;
            }
            // If we're here, it means the user gave a numeric argument

            // Get the player object that represents the player changing the nickname
            const playerObject = await getPlayerObject(getGuildMember(parsedUserCommand.originalMessage.author, parsedUserCommand.channel.guild));

            // Don't allow identifiers that are out of the player's collection's range
            if (animalNumber < 1 || animalNumber > playerObject.getAnimalIds().length) {
                betterSend(parsedUserCommand.channel, 'Numeric animal identifiers need to be within the range of numbers in your animal collection.');
                return;
            }

            // Get the player's animal that's at the given inventory position
            try {
                animalObject = await getAnimalByInventoryPosition(playerObject, animalNumber - 1);
            }
            catch (error) {
                throw new Error(error);
            }
        }

        // Create and send an info message with the found animal object
        const infoMessage = new AnimalInfoMessage(interactiveMessageHandler, parsedUserCommand.channel, animalObject);
        infoMessage.send();
    }
}