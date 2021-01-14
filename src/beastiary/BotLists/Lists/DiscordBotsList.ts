import { DISCORD_BOATS_TOKEN } from "../../../config/secrets";
import BotList from "../BotList";

export default class DiscordBotsList extends BotList {
    protected readonly APIpath = "https://discord.bots.gg/api/vi/bots/:id/stats";
    protected readonly APItoken = DISCORD_BOATS_TOKEN;
    protected readonly guildCountPropertyName = "guildCount";
    protected readonly shardCountPropertyName = "shardCount"
}