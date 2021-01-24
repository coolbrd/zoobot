import { DISCORD_BOTS_GG_TOKEN } from "../../../config/secrets";
import BotList from "../BotList";

export default class DiscordBotsGGList extends BotList {
    protected readonly APIpath = "https://discord.bots.gg/api/v1/bots/:id/stats";
    protected readonly APItoken = DISCORD_BOTS_GG_TOKEN;
    protected readonly guildCountPropertyName = "guildCount";
    protected readonly shardCountPropertyName = "shardCount";
}