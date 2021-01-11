import BeastiaryClient from "../bot/BeastiaryClient";
import { betterSend } from "../discordUtility/messageMan";
import Command from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class ListGuildsCommand extends Command {
    public readonly names = ["listguilds"];

    public readonly info = "List all the guilds I'm in";

    public readonly helpUseString = "to see every guild I'm currenty in.";

    public adminOnly = true;

    public async run(parsedMessage: CommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        let guildString = "";
        for (const guild of beastiaryClient.discordClient.guilds.cache.values()) {
            guildString += `${guild.name}: \`${guild.id}\`\n`;
        }

        betterSend(parsedMessage.channel, guildString);

        return this.newReceipt();
    }
}
export default new ListGuildsCommand();