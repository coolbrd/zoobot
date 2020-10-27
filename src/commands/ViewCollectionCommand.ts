import Command, { CommandSection } from "../structures/Command";
import CommandParser from "../structures/CommandParser";
import CollectionMessage from "../messages/CollectionMessage";
import { betterSend } from "../discordUtility/messageMan";
import { GuildMember } from "discord.js";
import { stripIndents } from "common-tags";
import { beastiary } from "../beastiary/Beastiary";
import { Player } from "../models/Player";
import getGuildMember from "../discordUtility/getGuildMember";
import handleUserError from "../discordUtility/handleUserError";

// Sends a message containing a player's collection of animals
export default class ViewCollectionCommand implements Command {
    public readonly commandNames = ["collection", "col", "c"];

    public readonly info = "View you or another player's collection of animals";

    public readonly section = CommandSection.playerInfo;

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

        // Get a specified player or use the command sender
        let targetPlayer: Player;
        if (parsedUserCommand.arguments.length > 0) {
            try {
                targetPlayer = await beastiary.players.fetchByArgument(parsedUserCommand.arguments[0], true);
            }
            catch (error) {
                if (handleUserError(parsedUserCommand.channel, error, )) {
                    throw new Error(`There was an error fetching a player by an argument ${error}`);
                }
                return;
            }
        }
        else {
            try {
                targetPlayer = await beastiary.players.fetch(getGuildMember(parsedUserCommand.originalMessage.author, parsedUserCommand.channel));
            }
            catch (error) {
                throw new Error(`There was an error fetching a player in the view crew command: ${error}`);
            }
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