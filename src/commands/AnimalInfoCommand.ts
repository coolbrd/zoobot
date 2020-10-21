import { beastiary } from "../beastiary/Beastiary";
import { betterSend } from "../discordUtility/messageMan";
import AnimalInfoMessage from "../messages/AnimalInfoMessage";
import { Animal } from "../models/Animal";
import Command, { CommandSection } from "../structures/Command";
import CommandParser from "../structures/CommandParser";

// Displays the information of a player's captured animal
export default class AnimalInfoCommand implements Command {
    public readonly commandNames = ["animalinfo", "ai", "stats"];

    public readonly info = "View the stats, info, and card of a captured animal";

    public readonly section = CommandSection.info;

    public help(prefix: string): string {
        return `Use \`${prefix}${this.commandNames[0]}\` \`<animal number or nickname>\` to view information about that animal.`;
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

        // The string representing the animal to get the info of
        const animalIdentifier = parsedUserCommand.fullArguments;

        // Search for an animal in the source guild by the given search argument, which can be a nickname or a position
        let animalObject: Animal | undefined;
        try {
            animalObject = await beastiary.animals.searchAnimal(animalIdentifier, {
                guildId: parsedUserCommand.channel.guild.id,
                userId: parsedUserCommand.originalMessage.author.id,
                searchByPosition: true 
            });
        }
        catch (error) {
            throw new Error(`There was an error attempting to search an animal for the info command: ${error}`);
        }

        // If no animal by that nickname or position exists in the guild
        if (!animalObject) {
            betterSend(parsedUserCommand.channel, "No animal by that nickname/number could be found in this server.");
            return;
        }

        // Create and send an info message with the found animal object
        const infoMessage = new AnimalInfoMessage(parsedUserCommand.channel, animalObject);
        
        try {
            await infoMessage.send();
        }
        catch (error) {
            throw new Error(`There was an error sending an animal information message: ${error}`);
        }
    }
}