import { Message } from "discord.js";
import { beastiary } from "../beastiary/Beastiary";
import awaitUserNextMessage from "../discordUtility/awaitUserNextMessage";
import { betterSend } from "../discordUtility/messageMan";
import { PlayerGuild } from "../structures/GameObject/GameObjects/PlayerGuild";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import { stripIndents } from "common-tags";

export default class SetEncounterChannelCommand extends GuildCommand {
    public readonly commandNames = ["setencounterchannel"];

    public readonly info = "Sets the channel that random encounters will appear in";

    public readonly section = CommandSection.guildManagement;

    public help(displayPrefix: string): string {
        return `Use \`${displayPrefix}${this.commandNames[0]}\` in the channel you want random encounters to spawn in.`;
    }

    public async run(parsedMessage: GuildCommandParser): Promise<void> {
        if (!parsedMessage.member.hasPermission("MANAGE_CHANNELS")) {
            betterSend(parsedMessage.channel, "You need the `Manage Channels` permission to change the default encounter channel.");
            return;
        }

        let playerGuild: PlayerGuild;
        try {
            playerGuild = await beastiary.playerGuilds.fetchByGuildId(parsedMessage.guild.id);
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error fetching a player guild in the set encounter channel command.

                Guild id: ${parsedMessage.guild.id}
                
                ${error}
            `);
        }

        betterSend(parsedMessage.channel, `Change pending, respond with "yes" to confirm ${parsedMessage.channel} as the new channel where random encounters will spawn.`);

        let userResponse: Message | undefined;
        try {
            userResponse = await awaitUserNextMessage(parsedMessage.channel, parsedMessage.sender, 10000);
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error getting a user's response message when changing a guild's default encounter channel.

                Parsed message: ${JSON.stringify(parsedMessage)}
                
                ${error}
            `);
        }

        if (userResponse && userResponse.content.toLowerCase() === "yes") {
            playerGuild.encounterChannelId = parsedMessage.channel.id;

            betterSend(parsedMessage.channel, `Success! All random animal encounters due to server activity will now spawn in ${parsedMessage.channel}.`);
        }
        else {
            betterSend(parsedMessage.channel, "Change canceled.");
        }
    }
}