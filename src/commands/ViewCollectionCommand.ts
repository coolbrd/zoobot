import Command from "../structures/Command";
import CommandParser from "../structures/CommandParser";
import CollectionMessage from "../messages/CollectionMessage";
import { betterSend } from "../discordUtility/messageMan";
import { User } from "discord.js";
import { stripIndents } from "common-tags";

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

        // The potential location for the target user to go
        let specifiedUser: User | undefined;
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
            const specifiedMember = parsedUserCommand.channel.guild.member(userId);

            // If no guild member exists with the given id
            if (!specifiedMember) {
                betterSend(parsedUserCommand.channel, `No user with the id \`${userId}\` exists in this server.`);
                return;
            }

            // Assign the specified user
            specifiedUser = specifiedMember.user;
        }

        // Create and send a new collection message displaying the specified player's collection, or the command sender if no user was specified
        const collectionMessage = new CollectionMessage(parsedUserCommand.channel, specifiedUser || parsedUserCommand.originalMessage.author);
        
        try {
            await collectionMessage.send();
        }
        catch (error) {
            throw new Error(`There was an error sending a user collection message: ${error}`);
        }
    }
}