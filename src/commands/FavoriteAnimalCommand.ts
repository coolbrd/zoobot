import { beastiary } from "../beastiary/Beastiary";
import getGuildMember from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import { Animal } from "../structures/GameObject/GameObjects/Animal";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import { stripIndents } from "common-tags";

export default class FavoriteAnimalCommand extends GuildCommand {
    public readonly commandNames = ["favorite", "favoriteanimal", "f"];

    public readonly info = "Select your favorite animal to put at the top of your collection";

    public readonly section = CommandSection.animalManagement;

    public readonly reactConfirm = true;

    public help(displayPrefix: string): string {
        return `Use \`${displayPrefix}${this.commandNames[0]}\` \`<animal name or number>\` to select your favorite animal, which will be displayed at the top of your collection and on your profile.`;
    }

    public async run(parsedMessage: GuildCommandParser): Promise<boolean> {
        if (!parsedMessage.fullArguments) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix));
            return false;
        }

        const searchTerm = parsedMessage.fullArguments.toLowerCase();

        const guildMember = getGuildMember(parsedMessage.sender, parsedMessage.channel.guild);

        let player: Player;
        try {
            player = await beastiary.players.fetch(guildMember)
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error getting a player in the favorite animal command.
                
                Guild member: ${JSON.stringify(guildMember)}

                ${error}
            `);
        }

        let animal: Animal | undefined;
        try {
            animal = await beastiary.animals.searchAnimal(searchTerm, {
                playerObject: player,
                searchList: "collection"
            });
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error searching an animal in the favorite command.

                Search term: ${searchTerm}
                Player: ${JSON.stringify(player)}
                
                ${error}
            `);
        }

        if (!animal) {
            betterSend(parsedMessage.channel, `No animal with the nickname/number \`${searchTerm}\` exists in your collection.`);
            return false;
        }

        player.removeAnimalIdFromCollection(animal.id);
        player.addAnimalIdsToCollectionPositional([animal.id], 0);

        return true;
    }
}