import { stripIndent } from "common-tags";
import handleUserError from "../../discordUtility/handleUserError";
import CrewMessage from "../../messages/CrewMessage";
import { Player } from "../../structures/GameObject/GameObjects/Player";
import { CommandSection, GuildCommand } from "../../structures/Command/Command";
import { GuildCommandParser } from "../../structures/Command/CommandParser";
import CrewAddSubCommand from "./CrewAddSubCommand";
import CrewRemoveSubCommand from "./CrewRemoveSubCommand";
import CommandReceipt from "../../structures/Command/CommandReceipt";
import BeastiaryClient from "../../bot/BeastiaryClient";
import CrewClearSubCommand from "./CrewClearSubCommand";

class CrewCommand extends GuildCommand {
    public readonly names = ["crew"];

    public readonly subCommands = [
        CrewAddSubCommand,
        CrewRemoveSubCommand,
        CrewClearSubCommand
    ];

    public readonly info = "Manage your crew of selected animals";

    public readonly helpUseString = "to view the animals currently earning xp in your crew.";

    public readonly sections = [CommandSection.gameplay, CommandSection.animalManagement];

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();
        
        let player: Player;
        try {
            player = await beastiaryClient.beastiary.players.fetchByGuildCommandParser(parsedMessage);
        }
        catch (error) {
            handleUserError(parsedMessage.channel, error as Error);
            return commandReceipt;
        }

        const crewMessage = new CrewMessage(parsedMessage.channel, beastiaryClient, player);

        try {
            await crewMessage.send();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error sending a crew message.

                Crew message: ${crewMessage.debugString}
                
                ${error}
            `);
        }

        return commandReceipt;
    }
}
export default new CrewCommand();