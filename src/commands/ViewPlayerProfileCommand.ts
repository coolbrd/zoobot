import { stripIndents } from "common-tags";
import { beastiary } from "../beastiary/Beastiary";
import handleUserError from "../discordUtility/handleUserError";
import PlayerProfileMessage from "../messages/PlayerProfileMessage";
import { Player } from "../models/Player";
import { CommandSection, GuildCommand } from "../structures/Command";
import { GuildCommandParser } from "../structures/CommandParser";

export default class ViewPlayerProfileCommand extends GuildCommand {
    public readonly commandNames = ["profile", "p"];

    public readonly info = "View you or another player's profile";

    public readonly section = CommandSection.playerInfo;

    public help(displayPrefix: string): string {
        return stripIndents`
            Use \`${displayPrefix}${this.commandNames[0]}\` to view your profile.
            You can also use \`${displayPrefix}${this.commandNames[0]}\` \`<user tag or id>\` to view another user's profile.
        `;
    }

    public async run(parsedMessage: GuildCommandParser): Promise<void> {
        let player: Player;
        try {
            player = await beastiary.players.fetchByGuildCommandParser(parsedMessage);
        }
        catch (error) {
            if (handleUserError(parsedMessage.channel, error)) {
                throw error;
            }
            return;
        }

        const playerProfileMessage = new PlayerProfileMessage(parsedMessage.channel, player);

        try {
            await playerProfileMessage.send();
        }
        catch (error) {
            throw new Error(`There was an error sending a profile message: ${error}`);
        }
    }
}