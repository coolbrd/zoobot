import Command from "../structures/Command";
import CommandParser from "../structures/CommandParser";
import CollectionMessage from "../messages/CollectionMessage";
import { betterSend } from "../discordUtility/messageMan";
import { GuildMember, User } from "discord.js";
import { stripIndents } from "common-tags";
import { beastiary } from "../beastiary/Beastiary";
import { Player } from "../models/Player";
import getGuildMember from "../discordUtility/getGuildMember";

// Sends a message containing a player's collection of animals
export default class ViewCollectionCommand implements Command {
    public readonly commandNames = ["collection", "col", "c"];

    public readonly info = "View your collection of animals"

    public help(commandPrefix: string): string {
        return stripIndents`
            Use \`${commandPrefix}${this.commandNames[0]}\` to see your collection of captured animals.

            You can also do \`${commandPrefix}${this.commandNames[0]}\` \`<user tag or id>\` to view somebody else's collection.
        `;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        // Don't run the command if it's in DMs
        if (parsedUserCommand.channel.type === "dm") {
            betterSend(parsedUserCommand.channel, "The collection command can only be used in servers.");
            return;
        }

        // The potential target guild member
        let specifiedMember: GuildMember | undefined;
        // If the user provided an argument (presumably the user whose collection they want to view)
        if (parsedUserCommand.arguments.length > 0) {
            let userId: string;
            // The location of the beginning of a user tag, if present
            const tagPosition = parsedUserCommand.arguments[0].search(/<@!.*>/);
            // If a tag was found in the first argument
            if (tagPosition !== -1) {
                // Extract the user id from the tag
                userId = parsedUserCommand.arguments[0].slice(tagPosition + 3, tagPosition + 3 + 18);
            }
            // If the argument is not a tag
            else {
                // Interpret the argument as a plain id
                userId = parsedUserCommand.arguments[0];
            }

            // Get the guild member with the extracted id
            specifiedMember = parsedUserCommand.channel.guild.member(userId) || undefined;

            // If no guild member exists with the given id
            if (!specifiedMember) {
                betterSend(parsedUserCommand.channel, `No user with the id \`${userId}\` exists in this server.`);
                return;
            }

            // Determine whether or not the specified player exists in The Beastiary
            let playerExists: boolean;
            try {
                playerExists = await beastiary.players.playerExists(specifiedMember);
            }
            catch (error) {
                throw new Error(`There was an error checking if a player exists in the view collection command: ${error}`);
            }

            // If no player exists for the guild member, don't create a new one
            if (!playerExists) {
                betterSend(parsedUserCommand.channel, "That user has yet to become a player in The Beastiary, tell them to catch some animals!");
                return;
            }
        }

        // Use the command sender as the member to display if no other member was found/provided
        if (!specifiedMember) {
            specifiedMember = getGuildMember(parsedUserCommand.originalMessage.author, parsedUserCommand.channel);
        }

        // Get the player object of the target member
        let targetPlayer: Player;
        try {
            targetPlayer = await beastiary.players.fetch(specifiedMember);
        }
        catch (error) {
            throw new Error(`There was an error fetching a specified player in the view collection command: ${error}`);
        }

        // Create and send a new collection message displaying the specified player's collection
        const collectionMessage = new CollectionMessage(parsedUserCommand.channel, targetPlayer);
        
        try {
            await collectionMessage.send();
        }
        catch (error) {
            throw new Error(`There was an error sending a user collection message: ${error}`);
        }
    }
}