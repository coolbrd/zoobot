import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CollectionMessage from "../messages/CollectionMessage";
import { stripIndents } from "common-tags";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { beastiary } from "../beastiary/Beastiary";
import handleUserError from "../discordUtility/handleUserError";

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
        let player: Player;
        try {
            player = await beastiary.players.fetchByGuildCommandParser(parsedMessage);
        }
        catch (error) {
            handleUserError(parsedMessage.channel, error);
            return;
        }

        const collectionMessage = new CollectionMessage(parsedMessage.channel, player);

        try {
            await collectionMessage.send();
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error sending a collection message.

                Collection message: ${JSON.stringify(collectionMessage)}
                
                ${error}
            `);
        }
    }
}