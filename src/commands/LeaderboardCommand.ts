import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import ServerLeaderBoardMessage from "../messages/ServerLeaderBoardMessage";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";
import { Player } from "../structures/GameObject/GameObjects/Player";

class LeaderboardCommand extends GuildCommand {
    public readonly names = ["leaderboard", "leader", "leaders", "top"];

    public readonly info = "View various rankings of everybody in your server";

    public readonly helpUseString = "to see the leaderboards for your server.";

    public readonly sections = [CommandSection.info];

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const receipt = this.newReceipt();

        let players: Player[];
        try {
            players = await beastiaryClient.beastiary.players.getAllPlayersByIds({ guildId: parsedMessage.guild.id });
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching all the players within a guild.

                Guild id: ${parsedMessage.guild.id}

                ${error}
            `);
        }

        const leaderboardMessage = new ServerLeaderBoardMessage(parsedMessage.channel, beastiaryClient, players);

        try {
            await leaderboardMessage.send();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error sending a server leaderboard message.

                ${error}
            `);
        }

        return receipt;
    }
}
export default new LeaderboardCommand();