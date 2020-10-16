import getGuildMember from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import { Player } from "../models/Player";
import Command from "../structures/Command";
import CommandParser from "../structures/CommandParser";
import { errorHandler } from "../structures/ErrorHandler";
import { beastiary } from "../beastiary/Beastiary";
import { Animal } from "../models/Animal";

// Changes a user's animal's nickname
export default class ChangeAnimalNicknameCommand implements Command {
    public readonly commandNames = ["nickname", "nick", "nn"];

    public readonly info = "Change the nickname of one of your captured animals";

    public help(prefix: string): string {
        return `Use \`${prefix}${this.commandNames[0]}\` \`<animal identifier>\` to change the nickname of an animal in your collection.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        // Don't let this command be used in dms
        if (parsedUserCommand.channel.type === "dm") {
            betterSend(parsedUserCommand.channel, "This command can only be used in servers.");
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
            betterSend(parsedUserCommand.channel, "You need to specify the animal's numeric identifier (the number next to the animal's place in your inventory).");
            return;
        }

        let playerObject: Player;
        // Get the player object that represents the player changing the nickname
        try {
            playerObject = await beastiary.players.fetch(getGuildMember(parsedUserCommand.originalMessage.author, parsedUserCommand.channel.guild));
        }
        catch (error) {
            throw new Error(`There was an error attempting to get a player in the animal nickname command: ${error}`);
        }

        // Get the animal id at the player's given inventory position
        const animalId = playerObject.getAnimalIdPositional(animalNumber - 1);

        if (!animalId) {
            betterSend(parsedUserCommand.channel, "No animal in your inventory with that number exists.");
            return;
        }

        let animalObject: Animal;
        try {
            animalObject = await beastiary.animals.fetchById(animalId);
        }
        catch (error) {
            throw new Error(`There was an error fetching an animal by its id in the nickname change command: ${error}`);
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

        // If the user provided a new nickname to give the animal
        if (newNickname) {
            // The set of banned strings that cannot appear in animal nicknames
            const bannedSubStrings = ["*", "_", "`", "~", ">"];

            // Check for all banned substrings in animal names
            for (const substring of bannedSubStrings) {
                if (newNickname.includes(substring)) {
                    betterSend(parsedUserCommand.channel, `Animal nicknames can't contain any Discord-reserved formatting characters, such as: '${substring}'`);
                    return;
                }
            }
        }

        // Change the animal's nickname to the determined string
        try {
            await animalObject.setNickname(newNickname);
        }
        catch (error) {
            throw new Error(`There was an error attempting to change the nickname of an animal object: ${error}`);
        }

        // Indicate that the command was performed successfully
        parsedUserCommand.originalMessage.react("✅").catch(error => {
            errorHandler.handleError(error, "There was an error attempting to react to a message in the animal nickname command.");
        });
    }
}