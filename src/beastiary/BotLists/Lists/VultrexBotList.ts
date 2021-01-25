import { VULTREX_WEBHOOK_TOKEN, VULTREX_TOKEN } from "../../../config/secrets";
import BotList from "../BotList";

export default class VultrexBotList extends BotList {
    protected readonly APIpath = "https://api.discordbots.co/v1/public/bot/:id/stats";
    protected readonly APItoken = VULTREX_TOKEN;
    protected readonly guildCountPropertyName = "serverCount";
    protected readonly shardCountPropertyName = "shardCount";

    protected readonly webhookName = "vultrexHook";
    protected readonly webhookAuth = VULTREX_WEBHOOK_TOKEN;
    protected readonly webhookUserIdPropertyName = "userId";
    protected readonly webhookVoteEventName = "vote";
    protected readonly voteRewardAmount = 2;
}