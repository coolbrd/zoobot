import { stripIndent } from "common-tags";
import { TextChannel } from "discord.js";
import BeastiaryClient from "../bot/BeastiaryClient";
import { ADMIN_SERVER_ID, FEEDBACK_CHANNEL_ID } from "../config/secrets";
import { betterSend } from "../discordUtility/messageMan";
import SmartEmbed from "../discordUtility/SmartEmbed";

export default class ChannelManager {
    public feedbackChannel: TextChannel | undefined;

    private beastiaryClient: BeastiaryClient;

    constructor(beastiaryClient: BeastiaryClient) {
        this.beastiaryClient = beastiaryClient;
    }

    public async init(): Promise<void> {
        const adminGuild = this.beastiaryClient.discordClient.guilds.resolve(ADMIN_SERVER_ID);

        if (!adminGuild) {
            return;
        }

        const feedbackChannel = adminGuild.channels.resolve(FEEDBACK_CHANNEL_ID);

        if (!feedbackChannel) {
            throw new Error(stripIndent`
                Could not find the admin server feedback channel.

                Id: ${FEEDBACK_CHANNEL_ID}
            `);
        }

        let textChannel: TextChannel;
        try {
            textChannel = await feedbackChannel.fetch() as TextChannel;
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching the text channel from the feedback channel's guild channel.

                ${error}
            `);
        }

        this.feedbackChannel = textChannel;
    }

    public sendFeedbackMessage(userTag: string, userAvatarUrl: string, content: string): void {
        if (!this.feedbackChannel) {
            throw new Error(stripIndent`
                A feedback message was attempted to be sent in a channel manager that doesn't have access to the channel.
            `);
        }

        const feedbackEmbed = new SmartEmbed();

        feedbackEmbed.setAuthor(`Feedback from ${userTag}`, userAvatarUrl);
        feedbackEmbed.setDescription(content);

        betterSend(this.feedbackChannel, feedbackEmbed);
    }
}