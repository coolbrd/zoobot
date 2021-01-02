import { betterSend } from "../discordUtility/messageMan";
import AnimalInfoMessage from "../messages/AnimalInfoMessage";
import { Animal } from "../structures/GameObject/GameObjects/Animal";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import { stripIndent } from "common-tags";
import CommandReceipt from "../structures/Command/CommandReceipt";
import BeastiaryClient from "../bot/BeastiaryClient";

class AnimalInfoCommand extends GuildCommand {
    public readonly names = ["animalinfo", "ai", "stats"];

    public readonly info = "View the stats, info, and card of a captured animal";

    public readonly helpUseString = "`<animal number or nickname>` to view information about that animal. You can also use the keyword `last` to specify the last animal in your collection.";

    public readonly sections = [CommandSection.info];

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();
        
        if (!parsedMessage.currentArgument) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
        }

        const player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        const animalIdentifier = parsedMessage.restOfText.toLowerCase();

        let animal: Animal | undefined;
        try {
            animal = await beastiaryClient.beastiary.animals.searchPlayerOrGuildAnimal(animalIdentifier, player, parsedMessage.guild.id)
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error searching a player/guild animal in the animal info command.

                ${error}
            `);
        }

        if (!animal) {
            betterSend(parsedMessage.channel, "No animal by that nickname could be found in this server.");
            return commandReceipt;
        }

        const infoMessage = new AnimalInfoMessage(parsedMessage.channel, beastiaryClient, animal);
        
        try {
            await infoMessage.send();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error sending an animal information message.

                ${error}
            `);
        }

        return commandReceipt;
    }
}
export default new AnimalInfoCommand();