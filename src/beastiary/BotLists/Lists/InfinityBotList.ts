import { CUSTOM_WEBHOOK_SECRET, IBL_TOKEN } from "../../../config/secrets";
import BotList from "../BotList";

export default class InfinityBotList extends BotList {
    protected readonly APIpath = "https://infinitybotlist.com/api/bots/:id";
    protected readonly APItoken = IBL_TOKEN;
    protected readonly guildCountPropertyName = "servers";
    protected readonly shardCountPropertyName = "shards";

    protected readonly webhookName = "IBLhook";
    protected readonly webhookAuth = CUSTOM_WEBHOOK_SECRET;
    protected readonly webhookUserIdPropertyName = "userID";
    protected readonly webhookVoteEventName = "vote";
    protected readonly voteRewardAmount = 3;
}