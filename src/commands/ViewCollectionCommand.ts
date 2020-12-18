import { CommandArgumentInfo, CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CollectionMessage from "../messages/CollectionMessage";
import { stripIndent } from "common-tags";
import { Player } from "../structures/GameObject/GameObjects/Player";
import handleUserError from "../discordUtility/handleUserError";
import CommandReceipt from "../structures/Command/CommandReceipt";
import BeastiaryClient from "../bot/BeastiaryClient";

class ViewCollectionCommand extends GuildCommand {
    public readonly names = ["collection", "col", "c"];

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

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();
        
        let player: Player;
        try {
            player = await beastiaryClient.beastiary.players.fetchByGuildCommandParser(parsedMessage);
        }
        catch (error) {
            handleUserError(parsedMessage.channel, error);
            return commandReceipt;
        }

        const collectionMessage = new CollectionMessage(parsedMessage.channel, beastiaryClient, player);

        try {
            await collectionMessage.send();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error sending a collection message.
                
                ${error}
            `);
        }

        return commandReceipt;
    }
}
export default new ViewCollectionCommand();