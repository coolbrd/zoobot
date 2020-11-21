import { stripIndent } from "common-tags";
import { APIMessage, TextChannel, User } from "discord.js";
import { client } from "..";
import { beastiary } from "../beastiary/Beastiary";
import { ADMIN_SERVER_ID, FEEDBACK_CHANNEL_ID } from "../config/secrets";
import { betterSend } from "../discordUtility/messageMan";
import SmartEmbed from "../discordUtility/SmartEmbed";
import Command, { CommandSection } from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class FeedbackCommand extends Command {
    public readonly commandNames = ["feedback", "suggest"];

    public readonly info = "Send a suggestion straight to the support team";

    public readonly helpUseString = "to send a feedback message to the developer.";

    public readonly section = CommandSection.getInvolved;

    public readonly arguments = [
        {
            name: "message",
            info: "your message to send the the developer",
            required: true
        }
    ];

    private createFeedbackMessage(parsedMessage: CommandParser): APIMessage {
        const feedbackEmbed = new SmartEmbed();

        feedbackEmbed.setAuthor(`Feedback from ${parsedMessage.sender.tag}`, parsedMessage.sender.avatarURL() || undefined);
        feedbackEmbed.setDescription(parsedMessage.fullArguments);

        return new APIMessage(beastiary.channels.feedbackChannel, { embed: feedbackEmbed });
    }

    public async run(parsedMessage: CommandParser, commandReceipt: CommandReceipt): Promise<CommandReceipt> {
        if (!parsedMessage.fullArguments) {
            betterSend(parsedMessage.channel, "You have to include a message as your feedback!");
            return commandReceipt;
        }

        const feedbackMessage = this.createFeedbackMessage(parsedMessage);

        betterSend(beastiary.channels.feedbackChannel, feedbackMessage);

        betterSend(parsedMessage.channel, "Feedback sent!");

        return commandReceipt;
    }
}
export default new FeedbackCommand();