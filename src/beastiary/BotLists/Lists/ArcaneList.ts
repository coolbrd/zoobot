import { ARCANE_TOKEN } from "../../../config/secrets";
import BotList from "../BotList";

export default class ArcaneList extends BotList {
    protected readonly APIpath = "https://arcane-botcenter.xyz/api/:id/stats";
    protected readonly APItoken = ARCANE_TOKEN;
    protected readonly guildCountPropertyName = "server_count";
    protected readonly shardCountPropertyName = "shard_count";

    protected readonly webhookName = "arcaneHook";
    protected readonly webhookAuth = ARCANE_TOKEN;
    protected readonly webhookUserIdPropertyName = "userId";
    protected readonly webhookVoteEventName = "vote";
}