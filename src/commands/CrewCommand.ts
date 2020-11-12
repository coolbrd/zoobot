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

    public readonly info = "Manage your crew of selected animals";

    public readonly subCommands = [
        CrewAddSubCommand,
        CrewRemoveSubCommand
    ];

    public readonly section = CommandSection.animalManagement;

    public help(displayPrefix: string): string {
        return stripIndents`
            Use \`${displayPrefix}${this.commandNames[0]}\` to view the animals currently earning xp in your crew.

            You can also do \`${displayPrefix}${this.commandNames[0]}\` \`<user id or tag>\` to view another user's crew in this server.

            Use \`${displayPrefix}${this.commandNames[0]} add/remove\` \`<animal identifier>\` to add or remove animals from your crew.
        `;
    }

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