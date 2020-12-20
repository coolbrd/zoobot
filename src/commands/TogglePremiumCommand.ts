import BeastiaryClient from "../bot/BeastiaryClient";
import { GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class TogglePremiumCommand extends GuildCommand {
    public readonly names = ["togglepremium", "tp"];

    public readonly info = "Toggle a guild's premium status";

    public readonly helpUseString = "to toggle the current guild's premium status.";

    public readonly adminOnly = true;

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const playerGuild = await beastiaryClient.beastiary.playerGuilds.fetchByGuildId(parsedMessage.guild.id);

        playerGuild.premium = !playerGuild.premium;

        console.log(`${parsedMessage.guild.id} just toggled premium!`);

        const commandReceipt = this.newReceipt();
        commandReceipt.reactConfirm = true;
        return commandReceipt;
    }
}
export default new TogglePremiumCommand();