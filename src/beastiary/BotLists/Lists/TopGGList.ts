import { CUSTOM_WEBHOOK_SECRET, TOP_GG_TOKEN } from "../../../config/secrets";
import BotList from "../BotList";

export default class TopGGList extends BotList {
    protected readonly APIpath = "https://top.gg/api/bots/:id/stats";
    protected readonly APItoken = TOP_GG_TOKEN;
    protected readonly guildCountPropertyName = "server_count";
    protected readonly shardCountPropertyName = "shard_count";

    protected readonly webhookName = "topGGhook";
    protected readonly webhookAuth = CUSTOM_WEBHOOK_SECRET;
    protected readonly webhookUserIdPropertyName = "user";
    protected readonly webhookVoteEventName = "vote";
    protected readonly voteRewardAmount = 3;
}