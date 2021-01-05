import BeastiaryClient from "../../bot/BeastiaryClient";
import { GuildCommand } from "../../structures/Command/Command";
import { GuildCommandParser } from "../../structures/Command/CommandParser";
import CommandReceipt from "../../structures/Command/CommandReceipt";

class CrewClearSubCommand extends GuildCommand {
    public readonly names = ["clear", "c"];

    public readonly info = "Remove all animals from your crew";

    public readonly helpUseString = "to empty your crew in one go.";

    public readonly blocksInput = true;

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();

        const player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        player.crewAnimalIds.clear();

        commandReceipt.reactConfirm = true;
        
        return commandReceipt;
    }
}
export default new CrewClearSubCommand();