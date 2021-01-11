import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import { betterSend } from "../discordUtility/messageMan";
import Command from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";
import { PlayerGuild } from "../structures/GameObject/GameObjects/PlayerGuild";

class AnnounceInGuildCommand extends Command {
    public readonly names = ["announceinserver", "announceinguild"];
    
    public readonly info = "Make an announcement to one server";

    public readonly helpUseString = "`<id>` `<message>` to announce something to one server.";

    public readonly adminOnly = true;

    public async run(parsedMessage: CommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const receipt = this.newReceipt();

        if (!parsedMessage.currentArgument) {
            betterSend(parsedMessage.channel, "You need to specify an id and a message to send.");
            return receipt;
        }

        const guildId = parsedMessage.consumeArgument().text;

        let playerGuild: PlayerGuild | undefined;
        try {
            playerGuild = await beastiaryClient.beastiary.playerGuilds.fetchByGuildId(guildId);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching a player guild by a guild id in the announce to guild command.

                Guild id: ${guildId}

                ${error}
            `);
        }

        if (!playerGuild) {
            betterSend(parsedMessage.channel, "No guild by that id could be found.");
            return receipt;
        }

        const announcement = parsedMessage.restOfText;

        try {
            await playerGuild.announce(announcement);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error announcing something in a player guild.

                ${error}
            `);
        }

        receipt.reactConfirm = true;
        return receipt;
    }
}
export default new AnnounceInGuildCommand();