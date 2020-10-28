import { CommandSection, GuildCommand } from "../structures/Command";
import { GuildCommandParser } from "../structures/CommandParser";
import CollectionMessage from "../messages/CollectionMessage";
import { stripIndents } from "common-tags";
import { beastiary } from "../beastiary/Beastiary";
import { Player } from "../models/Player";
import handleUserError from "../discordUtility/handleUserError";

// Sends a message containing a player's collection of animals
export default class ViewCollectionCommand extends GuildCommand {
    public readonly commandNames = ["collection", "col", "c"];

    public readonly info = "View you or another player's collection of animals";

    public readonly section = CommandSection.playerInfo;

    public help(commandPrefix: string): string {
        return stripIndents`
            Use \`${commandPrefix}${this.commandNames[0]}\` to see your collection of captured animals.

            You can also do \`${commandPrefix}${this.commandNames[0]}\` \`<user tag or id>\` to view somebody else's collection.
        `;
    }

    public async run(parsedMessage: GuildCommandParser): Promise<void> {
        // Get a specified player or the command sender's player
        let player: Player;
        try {
            player = await beastiary.players.fetchByCommand(parsedMessage, 0, true);
        }
        catch (error) {
            if (handleUserError(parsedMessage.channel, error)) {
                throw new Error(`There was an error converting a parsed command to a player: ${error}`);
            }
            return;
        }

        // Create and send a new collection message displaying the specified player's collection
        const collectionMessage = new CollectionMessage(parsedMessage.channel, player);
        
        try {
            await collectionMessage.send();
        }
        catch (error) {
            throw new Error(`There was an error sending a user collection message: ${error}`);
        }
    }
}