import { CUSTOM_WEBHOOK_SECRET, DBL_TOKEN } from "../../../config/secrets";
import BotList from "../BotList";

export default class DiscordBotList extends BotList {
    protected readonly APIpath = "https://discordbotlist.com/api/v1/bots/:id/stats";
    protected readonly APItoken = DBL_TOKEN;
    protected readonly guildCountPropertyName = "guilds";
    protected readonly shardCountPropertyName = undefined;
    protected readonly userCountPropertyName = "users";

    protected readonly webhookName = "DBLhook";
    protected readonly webhookAuth = CUSTOM_WEBHOOK_SECRET;
    protected readonly webhookUserIdPropertyName = "id";
    protected readonly webhookVoteEventName = "vote";
}