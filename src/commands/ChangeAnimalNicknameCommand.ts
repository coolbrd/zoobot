import getGuildMember from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import Command, { CommandSection } from "../structures/Command";
import CommandParser from "../structures/CommandParser";
import { errorHandler } from "../structures/ErrorHandler";
import { beastiary } from "../beastiary/Beastiary";
import { Animal } from "../models/Animal";

// Changes a user's animal's nickname
export default class ChangeAnimalNicknameCommand implements Command {
    public readonly commandNames = ["nickname", "nick", "nn"];

    public readonly info = "Change the nickname of one of your captured animals";

    public readonly section = CommandSection.animalManagement;

    public help(prefix: string): string {
        return `Use \`${prefix}${this.commandNames[0]}\` \`<animal number or nickname>\` \`<new nickname>\` to change the nickname of an animal in your collection. Use quotation marks (") for any names with spaces in them.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        // Don't let this command be used in dms
        if (parsedUserCommand.channel.type === "dm") {
            betterSend(parsedUserCommand.channel, "This command can only be used in servers.");
            return;
        }

        // If the user provided no arguments
        if (parsedUserCommand.arguments.length < 1) {
            betterSend(parsedUserCommand.channel, this.help(parsedUserCommand.displayPrefix));
            return;
        }

        // The string representing the animal the change the nickname of
        const animalIdentifier = parsedUserCommand.arguments[0].text;

        // Get the guild user that initiated this command
        const guildMember = getGuildMember(parsedUserCommand.originalMessage.author, parsedUserCommand.channel);

        // Find an animal that matches the given search identifier (number or nickname)
        let animal: Animal | undefined;
        try {
            animal = await beastiary.animals.searchAnimal(animalIdentifier, {
                guildId: guildMember.guild.id,
                userId: guildMember.user.id,
                searchByPosition: true
            });
        }
        catch (error) {
            throw new Error(`There as an error searching an animal by its nickname: ${error}`);
        }

        // If no animal was found in that player's inventory
        if (!animal) {
            betterSend(parsedUserCommand.channel, "No animal by that number/nickname exists in your collection.");
            return;
        }

        // The nickname string that will be used
        let newNickname: string | null;
        // If the user didn't provide a nickname to use
        if (parsedUserCommand.arguments.length < 2) {
            // Set the animal's nickname as nothing, resetting it
            newNickname = null;
        }
        // If the user specified a nickname
        else {
            newNickname = parsedUserCommand.arguments[1].text;

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

        // Change the animal's nickname to the determined value
        try {
            await animal.setNickname(newNickname);
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