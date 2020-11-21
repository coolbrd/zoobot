import { stripIndent } from "common-tags";
import { TextChannel } from "discord.js";
import { client } from "..";
import { ADMIN_SERVER_ID, FEEDBACK_CHANNEL_ID } from "../config/secrets";

export default class ChannelManager {
    private _feedbackChannel: TextChannel | undefined;

    public async init(): Promise<void> {
        const adminGuild = client.guilds.resolve(ADMIN_SERVER_ID);

        if (!adminGuild) {
            return;
        }

        if (!adminGuild) {
            throw new Error(stripIndent`
                Could not find the admin server.

                Id: ${ADMIN_SERVER_ID}
            `);
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

        this._feedbackChannel = textChannel;
    }

    public get feedbackChannel(): TextChannel {
        if (!this._feedbackChannel) {
            throw new Error(stripIndent`
                The feedback channel was attempted to be accessed before it was loaded.
            `);
        }

        return this._feedbackChannel;
    }
}