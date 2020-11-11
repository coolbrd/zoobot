import { beastiary } from "../beastiary/Beastiary";
import getGuildMember from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import { Animal } from "../structures/GameObject/GameObjects/Animal";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import { stripIndents } from "common-tags";

export default class CrewAddCommand extends GuildCommand {
    public readonly commandNames = ["crewadd", "cra"];

    public readonly info = "Add an animal to your crew";

    public readonly section = CommandSection.animalManagement;

    public readonly blocksInput = true;

    public readonly reactConfirm = true;

    public help(displayPrefix: string): string {
        return `Use \`${displayPrefix}${this.commandNames[0]}\` \`<animal nickname or number>\` to add an animal to your crew, allowing them to passively earn xp.`;
    }

    public async run(parsedMessage: GuildCommandParser): Promise<boolean> {
        if (!parsedMessage.fullArguments) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix));
            return false;
        }

        const animalIdentifier = parsedMessage.fullArguments.toLowerCase();

        let animal: Animal | undefined;
        try {
            animal = await beastiary.animals.searchAnimal(animalIdentifier, {
                guildId: parsedMessage.guild.id,
                userId: parsedMessage.sender.id,
                searchList: "collection"
            });
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error searching for an animal when attempting to add an animal to a player's crew.

                Search term: ${animalIdentifier}
                Parsed message: ${JSON.stringify(parsedMessage)}
                
                ${error}
            `);
        }

        if (!animal) {
            betterSend(parsedMessage.channel, "No animal with that nickname/number exists in your collection.");
            return false;
        }

        const guildMember = getGuildMember(parsedMessage.sender, parsedMessage.channel);

        let player: Player;
        try {
            player = await beastiary.players.fetch(guildMember);
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error fetching a player in the animal add to crew command.

                Guild member: ${JSON.stringify(guildMember)}
                
                ${error}
            `);
        }

        if (player.crewAnimalIds.includes(animal.id)) {
            betterSend(parsedMessage.channel, "That animal is already in your crew.");
            return false;
        }

        if (player.crewAnimalIds.length >= 4) {
            betterSend(parsedMessage.channel, "Your crew is full, remove an animal and try again.");
            return false;
        }

        player.addAnimalIdToCrew(animal.id);

        return true;
    }
}