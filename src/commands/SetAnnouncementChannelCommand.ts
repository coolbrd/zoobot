import { Message, TextChannel } from "discord.js";
import awaitUserNextMessage from "../discordUtility/awaitUserNextMessage";
import { betterSend } from "../discordUtility/messageMan";
import { PlayerGuild } from "../structures/GameObject/GameObjects/PlayerGuild";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import { stripIndent } from "common-tags";
import CommandReceipt from "../structures/Command/CommandReceipt";
import BeastiaryClient from "../bot/BeastiaryClient";
import { inspect } from "util";

class SetAnnouncementChannelCommand extends GuildCommand {
    public readonly names = ["setannouncementchannel"];

    public readonly info = "Set the channel that announcements and updates will appear in";

    public readonly helpUseString = "in the channel you want announcements to be sent in.";

    public readonly sections = [CommandSection.gettingStarted, CommandSection.guildManagement];

    public readonly permissionRequirement = "MANAGE_CHANNELS";

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();

        let playerGuild: PlayerGuild | undefined;
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

        if (!playerGuild) {
            throw new Error(stripIndent`
                No player guild could be found for a guild in the change announcement channel command.
            `);
        }

        let channel: TextChannel | undefined;
        if (!parsedMessage.currentArgument) {
            channel = parsedMessage.channel;
        }
        else {
            const channelText = parsedMessage.consumeArgument().text;

            let potentialChannelId: string;
            if (channelText.length > 18) {
                potentialChannelId = channelText.slice(2, -1);
            }
            else {
                potentialChannelId = channelText;
            }

            const potentialGuildChannel = parsedMessage.guild.channels.cache.get(potentialChannelId);

            if (potentialGuildChannel) {
                channel = await potentialGuildChannel.fetch() as TextChannel;
            }
        }

        if (!channel) {
            betterSend(parsedMessage.channel, "You must specify a valid channel tag/id for me to select.");
            return commandReceipt;
        }

        betterSend(parsedMessage.channel, `Change pending, respond with "yes" to confirm ${channel} as the new channel where announcements will be sent.`);

        let userResponse: Message | undefined;
        try {
            userResponse = await awaitUserNextMessage(parsedMessage.channel, parsedMessage.sender, 10000);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error getting a user's response message when changing a guild's default announcement channel.

                Parsed message: ${inspect(parsedMessage)}
                
                ${error}
            `);
        }

        if (userResponse && userResponse.content.toLowerCase() === "yes") {
            playerGuild.announcementChannelId = channel.id;

            playerGuild.announce(`Success! All announcements will now be sent in ${channel}.`);
        }
        else {
            betterSend(parsedMessage.channel, "Change canceled.");
        }

        return commandReceipt;
    }
}
export default new SetAnnouncementChannelCommand();