import { beastiary } from "../beastiary/Beastiary";
import handleUserError from "../discordUtility/handleUserError";
import { betterSend } from "../discordUtility/messageMan";
import { Player } from "../models/Player";
import { CommandSection, GuildCommand } from "../structures/Command";
import { GuildCommandParser } from "../structures/CommandParser";

export default class ViewScrapsCommand extends GuildCommand {
    public readonly commandNames = ["scraps", "scrap", "s"];

    public readonly info = "View your current balance of scraps";

    public readonly section = CommandSection.playerInfo;

    public help(displayPrefix: string): string {
        return `Use \`${displayPrefix}${this.commandNames[0]}\` to view your current balance of scraps.`;
    }

    public async run(parsedMessage: GuildCommandParser): Promise<void> {
        let player: Player;
        try {
            player = await beastiary.players.fetchByGuildCommandParser(parsedMessage);
        }
        catch (error) {
            if (handleUserError(parsedMessage.channel, error)) {
                throw new Error(`There was an error fetching a player by a given command parser: ${error}`);
            }
            return;
        }

        betterSend(parsedMessage.channel, `${player.member.displayName}'s balance: **${player.scraps}** scraps.`);
    }
}