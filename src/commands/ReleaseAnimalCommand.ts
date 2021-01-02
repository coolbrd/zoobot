import { stripIndent } from "common-tags";
import { Message } from "discord.js";
import awaitUserNextMessage from "../discordUtility/awaitUserNextMessage";
import { betterSend } from "../discordUtility/messageMan";
import SmartEmbed from "../discordUtility/SmartEmbed";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";
import BeastiaryClient from "../bot/BeastiaryClient";

class ReleaseAnimalCommand extends GuildCommand {
    public readonly names = ["release", "r"];

    public readonly info = "Release an animal in exchange for some pep and essence";

    public readonly helpUseString = "`<animal name or number>` to release an animal from your collection.";

    public readonly sections = [CommandSection.gameplay, CommandSection.animalManagement];

    public readonly blocksInput = true;

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();
        
        if (!parsedMessage.currentArgument) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
        }

        const player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        const animalIdentifier = parsedMessage.restOfText.toLowerCase();

        const animal = beastiaryClient.beastiary.animals.searchPlayerAnimal(animalIdentifier, player);

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
            confirmMessage = await betterSend(parsedMessage.channel, releaseEmbed);
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
            message = await awaitUserNextMessage(parsedMessage.channel, parsedMessage.sender, 10000);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error awaiting a user's next message in the release command.

                Parsed message: ${JSON.stringify(parsedMessage)}
                
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
                await beastiaryClient.beastiary.animals.removeFromCache(animal.id);
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

            const pepEmoji = beastiaryClient.beastiary.emojis.getByName("pep");
            const essenceEmoji = beastiaryClient.beastiary.emojis.getByName("essence");

            betterSend(parsedMessage.channel, stripIndent`
                ${animal.displayName} was released.
                +**${animal.value}**${pepEmoji}, +**${animal.level * 2}**${essenceEmoji} (${animal.species.commonNames[0]}).
            `);
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