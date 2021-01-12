import { DBL_WEBHOOK_SECRET, DBL_WEB_AUTH } from "../../../config/secrets";
import BotList from "../BotList";

export default class DiscordBotList extends BotList {
    protected readonly APIpath = "https://discordbotlist.com/api/v1/bots/:id/stats";
    protected readonly APItoken = DBL_WEB_AUTH;
    protected readonly guildCountPropertyName = "guilds";
    protected readonly shardCountPropertyName = "shard_id";
    protected readonly userCountPropertyName = "users";

    protected readonly webhookName = "DBLhook";
    protected readonly webhookAuth = DBL_WEBHOOK_SECRET;
    protected readonly webhookUserIdPropertyName = "id";
    protected readonly webhookVoteEventName = "vote";
}