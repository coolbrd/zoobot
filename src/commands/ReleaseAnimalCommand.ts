import { stripIndent } from "common-tags";
import { APIMessage, Message } from "discord.js";
import { beastiary } from "../beastiary/Beastiary";
import awaitUserNextMessage from "../discordUtility/awaitUserNextMessage";
import { betterSend } from "../discordUtility/messageMan";
import SmartEmbed from "../discordUtility/SmartEmbed";
import { Animal } from "../structures/GameObject/GameObjects/Animal";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class ReleaseAnimalCommand extends GuildCommand {
    public readonly commandNames = ["release", "r"];

    public readonly info = "Release an animal from your collection in exchange for some scraps";

    public readonly helpUseString = "`<animal name or number>` to release an animal from your collection`";

    public readonly section = CommandSection.animalManagement;

    public readonly blocksInput = true;

    public async run(parsedMessage: GuildCommandParser, commandReceipt: CommandReceipt): Promise<CommandReceipt> {
        if (parsedMessage.arguments.length < 1) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
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
            throw new Error(stripIndent`
                There was an error searching an animal in the release command.

                Message: ${JSON.stringify(parsedMessage)}
                
                ${error}
            `);
        }

        if (!animal) {
            betterSend(parsedMessage.channel, `No animal with the nickname or number "${animalIdentifier}" exists in your collection.`);
            return commandReceipt;
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
            throw new Error(stripIndent`
                There was an error sending a release command confirmation message.

                Message: ${JSON.stringify(confirmMessage)}
                
                ${error}
            `);
        }

        if (!confirmMessage) {
            throw new Error(stripIndent`
                There was an error sending a release command confirmation message.

                Channel: ${JSON.stringify(parsedMessage.channel)}
            `);
        }

        let message: Message | undefined;
        try {
            message = await awaitUserNextMessage(parsedMessage.channel, parsedMessage.sender, 6000);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error awaiting a user's next message in the release command.

                Parsed message: ${JSON.stringify(parsedMessage)}
                
                ${error}
            `);
        }

        let player: Player;
        try {
            player = await beastiary.players.fetch(parsedMessage.member);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching a player in the release animal command.

                Member: ${parsedMessage.member}

                ${error}
            `);
        }

        if (message && message.content.toLowerCase() === "yes") {
            try {
                await player.releaseAnimal(animal.id);
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error deleting an animal in the release command.

                    Player: ${player.debugString}
                    Animal: ${animal.debugString}
                    
                    ${error}
                `);
            }

            try {
                await beastiary.animals.removeFromCache(animal.id);
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error removing a deleted animal from the cache.
    
                    Animal: ${animal.debugString}
                    
                    ${error}
                `);
            }

            try {
                await animal.delete();
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error deleting an animal object.
    
                    Animal: ${animal.debugString}
                    
                    ${error}
                `);
            }

            releaseEmbed.setDescription("Release confirmed.");
            releaseEmbed.setFooter("");

            try {
                await confirmMessage.edit(releaseEmbed);
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error editing a release confirmation message.

                    Confirmation message: ${JSON.stringify(confirmMessage)}
                    
                    ${error}
                `);
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
                throw new Error(stripIndent`
                    There was an error editing a release confirmation message.

                    Confirmation message: ${JSON.stringify(confirmMessage)}
                    
                    ${error}
                `);
            }
        }

        return commandReceipt;
    }
}
export default new ReleaseAnimalCommand();