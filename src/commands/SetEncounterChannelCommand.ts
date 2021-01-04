import { Message } from "discord.js";
import awaitUserNextMessage from "../discordUtility/awaitUserNextMessage";
import { betterSend } from "../discordUtility/messageMan";
import { PlayerGuild } from "../structures/GameObject/GameObjects/PlayerGuild";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import { stripIndent } from "common-tags";
import CommandReceipt from "../structures/Command/CommandReceipt";
import BeastiaryClient from "../bot/BeastiaryClient";
import { inspect } from "util";

class SetEncounterChannelCommand extends GuildCommand {
    public readonly names = ["setencounterchannel"];

    public readonly info = "Set the channel that random encounters will appear in";

    public readonly helpUseString = "in the channel you want random encounters to spawn in.";

    public readonly sections = [CommandSection.guildManagement];

    public readonly permissionRequirement = "MANAGE_CHANNELS";

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();

        let playerGuild: PlayerGuild;
        try {
            playerGuild = await beastiaryClient.beastiary.playerGuilds.fetchByGuildId(parsedMessage.guild.id);
        }
        catch (error) {
            throw new Error(stripIndent`
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
            throw new Error(stripIndent`
                There was an error getting a user's response message when changing a guild's default encounter channel.

                Parsed message: ${inspect(parsedMessage)}
                
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

        return commandReceipt;
    }
}
export default new SetEncounterChannelCommand();