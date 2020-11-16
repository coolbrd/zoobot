import { CommandArgumentInfo, CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CollectionMessage from "../messages/CollectionMessage";
import { stripIndent } from "common-tags";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { beastiary } from "../beastiary/Beastiary";
import handleUserError from "../discordUtility/handleUserError";
import CommandReceipt from "../structures/Command/CommandReceipt";

class ViewCollectionCommand extends GuildCommand {
    public readonly commandNames = ["collection", "col", "c"];

    public readonly info = "View you or another player's collection of animals";

    public readonly helpUseString = "to see your collection of captured animals.";

    public readonly arguments: CommandArgumentInfo[] = [
        {
            name: "user identifier",
            info: "the tag or plain user id of the user you want to select",
            optional: true,
            default: "you"
        }
    ];

    public readonly section = CommandSection.playerInfo;

    public async run(parsedMessage: GuildCommandParser, commandReceipt: CommandReceipt): Promise<CommandReceipt> {
        let player: Player;
        try {
            player = await beastiary.players.fetchByGuildCommandParser(parsedMessage);
        }
        catch (error) {
            handleUserError(parsedMessage.channel, error);
            return commandReceipt;
        }

        const collectionMessage = new CollectionMessage(parsedMessage.channel, player);

        try {
            await collectionMessage.send();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error sending a collection message.

                Collection message: ${collectionMessage.debugString}
                
                ${error}
            `);
        }

        return commandReceipt;
    }
}
export default new ViewCollectionCommand();