import { stripIndents } from "common-tags";
import { beastiary } from "../beastiary/Beastiary";
import handleUserError from "../discordUtility/handleUserError";
import CrewMessage from "../messages/CrewMessage";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CrewAddSubCommand from "./CrewAddSubCommand";
import CrewRemoveSubCommand from "./CrewRemoveSubCommand";
import CommandReceipt from "../structures/Command/CommandReceipt";

class CrewCommand extends GuildCommand {
    public readonly commandNames = ["crew"];

    public readonly subCommands = [
        CrewAddSubCommand,
        CrewRemoveSubCommand
    ];

    public readonly info = "Manage your crew of selected animals";

    public readonly helpUseString = "to view the animals currently earning xp in your crew.";

    public readonly section = CommandSection.animalManagement;

    public async run(parsedMessage: GuildCommandParser, commandReceipt: CommandReceipt): Promise<CommandReceipt> {
        let player: Player;
        try {
            player = await beastiary.players.fetchByGuildCommandParser(parsedMessage);
        }
        catch (error) {
            handleUserError(parsedMessage.channel, error);
            return commandReceipt;
        }

        const crewMessage = new CrewMessage(parsedMessage.channel, player);

        try {
            await crewMessage.send();
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error sending a crew message.

                Crew message: ${JSON.stringify(crewMessage)}
                
                ${error}
            `);
        }

        return commandReceipt;
    }
}
export default new CrewCommand();