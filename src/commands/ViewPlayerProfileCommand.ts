import { stripIndents } from "common-tags";
import { GuildMember } from "discord.js";
import { beastiary } from "../beastiary/Beastiary";
import getGuildMember from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import PlayerProfileMessage from "../messages/PlayerProfileMessage";
import { Player } from "../models/Player";
import Command from "../structures/Command";
import CommandParser from "../structures/CommandParser";

// Sends a message containing the player profile of a given player, or the command sender
export default class ViewPlayerProfileCommand implements Command {
    public readonly commandNames = ["profile", "p"];

    public readonly info = "View your or another player's profile";

    public help(displayPrefix: string): string {
        return stripIndents`
            Use \`${displayPrefix}${this.commandNames[0]}\` to view your profile.
            You can also use \`${displayPrefix}${this.commandNames[0]}\` \`<user tag or id>\` to view another user's profile.
        `;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        if (parsedUserCommand.channel.type === "dm") {
            betterSend(parsedUserCommand.channel, "This command can only be used in servers.");
            return;
        }

        let targetGuildMember: GuildMember;
        if (parsedUserCommand.arguments.length > 0) {
            const playerArgument = parsedUserCommand.arguments[0];

            if (!playerArgument.member) {
                betterSend(parsedUserCommand.channel, "Could not find a user in this guild with that tag/id.");
                return;
            }
            
            let playerExists: boolean;
            try {
                playerExists = await beastiary.players.playerExists(playerArgument.member);
            }
            catch (error) {
                throw new Error(`There was an error checking if a player exists in the player profile.`)
            }

            if (!playerExists) {
                betterSend(parsedUserCommand.channel, "That user doesn't have a profile in The Beastiary yet. Tell them to catch some animals!");
                return;
            }

            targetGuildMember = playerArgument.member;
        }
        else {
            targetGuildMember = getGuildMember(parsedUserCommand.originalMessage.author, parsedUserCommand.channel);
        }

        let player: Player;
        try {
            player = await beastiary.players.fetch(targetGuildMember);
        }
        catch (error) {
            throw new Error(`There was an error fetching a player in the player profile command: ${error}`);
        }

        const profileMessage = new PlayerProfileMessage(parsedUserCommand.channel, player);

        try {
            await profileMessage.send();
        }
        catch (error) {
            throw new Error(`There was an error sending a player profile message: ${error}`);
        }
    }
}