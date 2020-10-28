import getGuildMember from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import { CommandSection, GuildCommand } from "../structures/Command";
import { GuildCommandParser } from "../structures/CommandParser";
import { beastiary } from "../beastiary/Beastiary";
import { Animal } from "../models/Animal";

// Changes a user's animal's nickname
export default class ChangeAnimalNicknameCommand extends GuildCommand {
    public readonly commandNames = ["nickname", "nick", "nn"];

    public readonly info = "Change the nickname of one of your captured animals";

    public readonly section = CommandSection.animalManagement;

    public readonly reactConfirm = true;

    public help(prefix: string): string {
        return `Use \`${prefix}${this.commandNames[0]}\` \`<animal number or nickname>\` \`<new nickname>\` to change the nickname of an animal in your collection. Use quotation marks (") for any names with spaces in them.`;
    }

    public async run(parsedMessage: GuildCommandParser): Promise<boolean> {
        // If the user provided no arguments
        if (parsedMessage.arguments.length < 1) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix));
            return false;
        }

        // The string representing the animal the change the nickname of
        const animalIdentifier = parsedMessage.arguments[0].text;

        // Get the guild user that initiated this command
        const guildMember = getGuildMember(parsedMessage.originalMessage.author, parsedMessage.channel);

        // Find an animal that matches the given search identifier (number or nickname)
        let animal: Animal | undefined;
        try {
            animal = await beastiary.animals.searchAnimal(animalIdentifier, {
                guildId: guildMember.guild.id,
                userId: guildMember.user.id,
                positionalList: "collection"
            });
        }
        catch (error) {
            throw new Error(`There as an error searching an animal by its nickname: ${error}`);
        }

        // If no animal was found in that player's collection
        if (!animal) {
            betterSend(parsedMessage.channel, "No animal by that number/nickname exists in your collection.");
            return false;
        }

        // The nickname string that will be used
        let newNickname: string | null;
        // If the user didn't provide a nickname to use
        if (parsedMessage.arguments.length < 2) {
            // Set the animal's nickname as nothing, resetting it
            newNickname = null;
        }
        // If the user specified a nickname
        else {
            newNickname = parsedMessage.arguments[1].text;

            // The set of banned strings that cannot appear in animal nicknames
            const bannedSubStrings = ["*", "_", "`", "~", ">"];

            // Check for all banned substrings in animal names
            for (const substring of bannedSubStrings) {
                if (newNickname.includes(substring)) {
                    betterSend(parsedMessage.channel, `Animal nicknames can't contain any Discord-reserved formatting characters, such as: '${substring}'`);
                    return false;
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

        return true;
    }
}