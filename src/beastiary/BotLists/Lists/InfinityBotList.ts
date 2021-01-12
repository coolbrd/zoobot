import { IBL_TOKEN, IBL_WEBHOOK_SECRET } from "../../../config/secrets";
import BotList from "../BotList";

export default class InfinityBotList extends BotList {
    protected readonly APIpath = "https://infinitybotlist.com/api/bots/:id";
    protected readonly APItoken = IBL_TOKEN;
    protected readonly guildCountPropertyName = "servers";
    protected readonly shardCountPropertyName = "shards";
    protected readonly userCountPropertyName = undefined;

    protected readonly webhookName = "IBLhook";
    protected readonly webhookAuth = IBL_WEBHOOK_SECRET;
    protected readonly webhookUserIdPropertyName = "userID";
    protected readonly webhookVoteEventName = "vote";
}