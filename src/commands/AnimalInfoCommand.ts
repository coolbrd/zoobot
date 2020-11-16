import { beastiary } from "../beastiary/Beastiary";
import { betterSend } from "../discordUtility/messageMan";
import AnimalInfoMessage from "../messages/AnimalInfoMessage";
import { Animal } from "../structures/GameObject/GameObjects/Animal";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import { stripIndents } from "common-tags";
import CommandReceipt from "../structures/Command/CommandReceipt";

class AnimalInfoCommand extends GuildCommand {
    public readonly commandNames = ["animalinfo", "ai", "stats"];

    public readonly info = "View the stats, info, and card of a captured animal";

    public readonly helpUseString = "`<animal number or nickname>` to view information about that animal.";

    public readonly section = CommandSection.gettingStarted;

    public async run(parsedMessage: GuildCommandParser, commandReceipt: CommandReceipt): Promise<CommandReceipt> {
        if (parsedMessage.arguments.length < 1) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
        }

        const animalIdentifier = parsedMessage.fullArguments.toLowerCase();

        let animalObject: Animal | undefined;
        try {
            animalObject = await beastiary.animals.searchAnimal(animalIdentifier, {
                guildId: parsedMessage.guild.id,
                userId: parsedMessage.sender.id,
                searchList: "collection"
            });
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error attempting to search an animal for the info command.

                Parsed message: ${JSON.stringify(parsedMessage)}

                ${error}
            `);
        }

        if (!animalObject) {
            betterSend(parsedMessage.channel, "No animal by that nickname/number could be found in this server.");
            return commandReceipt;
        }

        const infoMessage = new AnimalInfoMessage(parsedMessage.channel, animalObject);
        
        try {
            await infoMessage.send();
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error sending an animal information message.

                Information message: ${infoMessage.debugString}
                
                ${error}
            `);
        }

        return commandReceipt;
    }
}
export default new AnimalInfoCommand();