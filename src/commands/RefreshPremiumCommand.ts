import BeastiaryClient from "../bot/BeastiaryClient";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class RefreshPremiumCommand extends GuildCommand {
    public readonly names = ["refreshpremium", "refresh"];

    public readonly info = "Manually refresh your premium status";

    public readonly helpUseString = "to manually refresh your player and server premium status, in case it hasn't updated automatically fast enough.";

    public readonly sections = [CommandSection.guildManagement];

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        await player.applyPotentialPremium();
        await player.playerGuild.applyPotentialPremium();

        const receipt = this.newReceipt();
        receipt.reactConfirm = true;
        return receipt;
    }
}
export default new RefreshPremiumCommand();