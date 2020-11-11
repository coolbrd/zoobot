import { stripIndents } from "common-tags";
import { APIMessage, Message } from "discord.js";
import { beastiary } from "../beastiary/Beastiary";
import awaitUserNextMessage from "../discordUtility/awaitUserNextMessage";
import { betterSend } from "../discordUtility/messageMan";
import SmartEmbed from "../discordUtility/SmartEmbed";
import { Animal } from "../structures/GameObject/GameObjects/Animal";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";

export default class ReleaseAnimalCommand extends GuildCommand {
    public readonly commandNames = ["release", "r"];

    public readonly info = "Release an animal from your collection in exchange for some scraps";

    public readonly section = CommandSection.animalManagement;

    public readonly blocksInput = true;

    public help(displayPrefix: string): string {
        return `Use \`${displayPrefix}${this.commandNames[0]}\` \`<animal name or number>\` to release an animal from your collection`;
    }

    public async run(parsedMessage: GuildCommandParser): Promise<void> {
        if (parsedMessage.arguments.length < 1) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix));
            return;
        }

        const animalIdentifier = parsedMessage.fullArguments.toLowerCase();

        let animal: Animal | undefined;
        try {
            animal = await beastiary.animals.searchAnimal(animalIdentifier, {
                guildId: parsedMessage.channel.guild.id,
                userId: parsedMessage.originalMessage.author.id,
                searchList: "collection"
            });
        }
        catch (error) {
            throw new Error(`There was an error searching an animal in the release command: ${error}`);
        }

        if (!animal) {
            betterSend(parsedMessage.channel, `No animal with the nickname or number "${animalIdentifier}" exists in your collection.`);
            return;
        }

        const releaseEmbed = new SmartEmbed();

        releaseEmbed.setTitle(`Release ${animal.displayName}?`);
        releaseEmbed.setThumbnail(animal.card.url);
        releaseEmbed.setDescription("Confirm this release by responding with \"yes\".");
        releaseEmbed.setFooter("This release will automatically cancel if no response is given.");
        releaseEmbed.setColor(0xFF0000);

        let confirmMessage: Message | undefined;
        try {
            confirmMessage = await betterSend(parsedMessage.channel, new APIMessage(parsedMessage.channel, { embed: releaseEmbed }));
        }
        catch (error) {
            throw new Error(`There was an error sending a release command confirmation message: ${error}`);
        }

        if (!confirmMessage) {
            throw new Error("There was an error sending a release command confirmation message.");
        }

        let message: Message | undefined;
        try {
            message = await awaitUserNextMessage(parsedMessage.channel, parsedMessage.sender, 6000);
        }
        catch (error) {
            throw new Error(`There was an error awaiting a user's next message in the release command: ${error}`);
        }

        let player: Player;
        try {
            player = await beastiary.players.fetch(parsedMessage.member);
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error fetching a player in the release animal command.
                Member: ${parsedMessage.member}
                Error: ${error}
            `);
        }

        if (message && message.content.toLowerCase() === "yes") {
            try {
                await player.releaseAnimal(animal.id);
            }
            catch (error) {
                throw new Error(`There was an error deleting an animal in the release command: ${error}`);
            }

            releaseEmbed.setDescription("Release confirmed.");
            releaseEmbed.setFooter("");

            try {
                await confirmMessage.edit(releaseEmbed);
            }
            catch (error) {
                throw new Error(`There was an error editing a release confirmation message: ${error}`);
            }

            betterSend(parsedMessage.channel, `${animal.displayName} was released. **+${animal.value}** scraps.`);
        }
        // If the user didn't respond, or responded with anything other than yes
        else {
            releaseEmbed.setDescription("Release canceled.");
            releaseEmbed.setFooter("");
            try {
                await confirmMessage.edit(releaseEmbed);
            }
            catch (error) {
                throw new Error(`There was an error editing a release confirmation message: ${error}`);
            }
        }
    }
}