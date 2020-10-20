import { APIMessage, Message } from "discord.js";
import { beastiary } from "../beastiary/Beastiary";
import awaitUserNextMessage from "../discordUtility/awaitUserNextMessage";
import { betterSend } from "../discordUtility/messageMan";
import SmartEmbed from "../discordUtility/SmartEmbed";
import { Animal } from "../models/Animal";
import Command from "../structures/Command";
import CommandParser from "../structures/CommandParser";
import { errorHandler } from "../structures/ErrorHandler";

// Releases an animal from a user's inventory
export default class ReleaseAnimalCommand implements Command {
    public readonly commandNames = ["release", "r"];

    public readonly info = "Release an animal from your collection";

    public help(displayPrefix: string): string {
        return `Use \`${displayPrefix}${this.commandNames[0]}\` \`<animal name or number>\` to release an animal from your collection`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        if (parsedUserCommand.channel.type === "dm") {
            betterSend(parsedUserCommand.channel, "The release command can only be used in servers, where you have animals!");
            return;
        }

        if (parsedUserCommand.arguments.length < 1) {
            betterSend(parsedUserCommand.channel, this.help(parsedUserCommand.displayPrefix));
            return;
        }

        // The term to search the animal by
        const animalIdentifier = parsedUserCommand.arguments[0].toLowerCase();

        // Get the animal by the user's search string
        let animal: Animal | undefined;
        try {
            animal = await beastiary.animals.searchAnimal(animalIdentifier, {
                guildId: parsedUserCommand.channel.guild.id,
                userId: parsedUserCommand.originalMessage.author.id,
                searchByPosition: true
            });
        }
        catch (error) {
            throw new Error(`There was an error searching an animal in the release command: ${error}`);
        }

        if (!animal) {
            betterSend(parsedUserCommand.channel, `No animal with the nickname or number "${animalIdentifier}" exists in your collection.`);
            return;
        }

        const releaseEmbed = new SmartEmbed();

        releaseEmbed.setTitle(`Release ${animal.name}?`);
        releaseEmbed.setThumbnail(animal.card.url);
        releaseEmbed.setDescription("Confirm this release by responding with \"yes\".");
        releaseEmbed.setFooter("This release will automatically cancel if no response is given.");
        releaseEmbed.setColor(0xFF0000);

        // Confirm with the user
        let confirmMessage: Message | undefined;
        try {
            confirmMessage = await betterSend(parsedUserCommand.channel, new APIMessage(parsedUserCommand.channel, { embed: releaseEmbed }));
        }
        catch (error) {
            throw new Error(`There was an error sending a release command confirmation message: ${error}`);
        }

        if (!confirmMessage) {
            throw new Error("There was an error sending a release command confirmation message.");
        }

        // Wait for the user to respond
        let message: Message | undefined;
        try {
            message = await awaitUserNextMessage(parsedUserCommand.channel, parsedUserCommand.originalMessage.author, 6000);
        }
        catch (error) {
            throw new Error(`There was an error awaiting a user's next message in the release command: ${error}`);
        }

        // If the user didn't respond in time
        if (!message) {
            releaseEmbed.setDescription("Release canceled.");
            releaseEmbed.setFooter("");
            try {
                await confirmMessage.edit(releaseEmbed);
            }
            catch (error) {
                throw new Error(`There was an error editing a release confirmation message: ${error}`);
            }
        }
        // If the user confirmed the release
        else if (message.content.toLowerCase() === "yes") {
            // Delete the animal
            try {
                await beastiary.animals.deleteAnimal(animal.id);
            }
            catch (error) {
                throw new Error(`There was an error deleting an animal in the release command: ${error}`);
            }

            // Indicate that the command was performed successfully
            parsedUserCommand.originalMessage.react("✅").catch(error => {
                errorHandler.handleError(error, "There was an error attempting to react to a message in the animal nickname command.");
            });

            releaseEmbed.setDescription("Release confirmed.");
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