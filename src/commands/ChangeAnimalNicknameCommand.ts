import getGuildMember from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import { CommandSection, GuildCommand } from "../structures/Command";
import { GuildCommandParser } from "../structures/CommandParser";
import { beastiary } from "../beastiary/Beastiary";
import { Animal } from "../models/Animal";

export default class ChangeAnimalNicknameCommand extends GuildCommand {
    public readonly commandNames = ["nickname", "nick", "nn"];

    public readonly info = "Change the nickname of one of your captured animals";

    public readonly section = CommandSection.animalManagement;

    public readonly reactConfirm = true;

    public help(prefix: string): string {
        return `Use \`${prefix}${this.commandNames[0]}\` \`<animal number or nickname>\` \`<new nickname>\` to change the nickname of an animal in your collection. Use quotation marks (") for any names with spaces in them.`;
    }

    public async run(parsedMessage: GuildCommandParser): Promise<boolean> {
        if (parsedMessage.arguments.length < 1) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix));
            return false;
        }

        const animalIdentifier = parsedMessage.arguments[0].text;

        const guildMember = getGuildMember(parsedMessage.originalMessage.author, parsedMessage.channel);

        let animal: Animal | undefined;
        try {
            animal = await beastiary.animals.searchAnimal(animalIdentifier, {
                guildId: guildMember.guild.id,
                userId: guildMember.user.id,
                searchList: "collection"
            });
        }
        catch (error) {
            throw new Error(`There as an error searching an animal by its nickname: ${error}`);
        }

        if (!animal) {
            betterSend(parsedMessage.channel, "No animal by that number/nickname exists in your collection.");
            return false;
        }

        let newNickname: string | undefined;
        if (parsedMessage.arguments.length < 2) {
            // Set the animal's nickname as nothing, resetting it
            newNickname = undefined;
        }
        // If the user specified a nickname
        else {
            newNickname = parsedMessage.arguments[1].text;

            const bannedSubStrings = ["*", "_", "`", "~", ">"];

            for (const substring of bannedSubStrings) {
                if (newNickname.includes(substring)) {
                    betterSend(parsedMessage.channel, `Animal nicknames can't contain any Discord-reserved formatting characters, such as: '${substring}'`);
                    return false;
                }
            }
        }

        animal.nickname = newNickname;

        return true;
    }
}