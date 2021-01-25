import { CUSTOM_WEBHOOK_SECRET, DISCORD_BOATS_TOKEN } from "../../../config/secrets";
import BotList from "../BotList";

export default class DiscordBoatsList extends BotList {
    protected readonly APIpath = "https://discord.boats/api/bot/:id";
    protected readonly APItoken = DISCORD_BOATS_TOKEN;
    protected readonly guildCountPropertyName = "server_count";

    protected readonly webhookName = "discordBoatsHook";
    protected readonly webhookAuth = CUSTOM_WEBHOOK_SECRET;
    protected readonly webhookUserIdPropertyName = ["user", "id"];
    protected readonly webhookVoteEventName = "vote";
    protected readonly voteRewardAmount = 2;
}