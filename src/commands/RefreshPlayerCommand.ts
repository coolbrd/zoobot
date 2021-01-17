import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import { GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class RefreshPlayerCommand extends GuildCommand {
    public readonly names = ["refreshplayer", "refresh"];

    public readonly info = "Refresh your player data, in case something isn't quite right";

    public readonly helpUseString = "to re-synchronize your player data with your saved data. Might be useful if you're getting strange errors.";

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const receipt = this.newReceipt();

        const player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        try {
            await beastiaryClient.beastiary.players.removeFromCache(player.id);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error refreshing a player's data.

                Player id: ${player.id}
            `);
        }

        receipt.reactConfirm = true;
        return receipt;
    }
}
export default new RefreshPlayerCommand();