import { BOTS_FOR_DISCORD_TOKEN, CUSTOM_WEBHOOK_SECRET } from "../../../config/secrets";
import BotList from "../BotList";

export default class BotsForDiscordList extends BotList {
    protected readonly APIpath = "https://botsfordiscord.com/api/bot/:id";
    protected readonly APItoken = BOTS_FOR_DISCORD_TOKEN;
    protected readonly guildCountPropertyName = "server_count";

    protected readonly webhookName = "BFDhook";
    protected readonly webhookAuth = CUSTOM_WEBHOOK_SECRET;
    protected readonly webhookUserIdPropertyName = "user";
    protected readonly webhookVoteEventName = "vote";
    protected readonly voteRewardAmount = 2;
}