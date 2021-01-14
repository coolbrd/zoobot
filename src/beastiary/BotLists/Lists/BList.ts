import { BLIST_TOKEN } from "../../../config/secrets";
import BotList from "../BotList";

export default class BList extends BotList {
    protected readonly APIpath = "https://blist.xyz/api/v2/bot/:id/stats/";
    protected readonly APItoken = BLIST_TOKEN;
    protected readonly guildCountPropertyName = "server_count";
    protected readonly shardCountPropertyName = "shard_count";
    protected readonly method = "PATCH";

    protected readonly webhookName = "BListHook";
    protected readonly webhookAuth = BLIST_TOKEN;
    protected readonly webhookUserIdPropertyName = "userId";
    protected readonly webhookVoteEventName = "vote";
}