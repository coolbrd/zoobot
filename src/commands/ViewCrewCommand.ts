import { stripIndents } from "common-tags";
import { beastiary } from "../beastiary/Beastiary";
import handleUserError from "../discordUtility/handleUserError";
import CrewMessage from "../messages/CrewMessage";
import { Player } from "../models/Player";
import { CommandSection, GuildCommand } from "../structures/Command";
import { GuildCommandParser } from "../structures/CommandParser";

// Displays a player's crew
export default class ViewCrewCommand extends GuildCommand {
    public readonly commandNames = ["crew"];

    public readonly info = "View your current crew of selected animals";

    public readonly section = CommandSection.animalManagement;

    public help(displayPrefix: string): string {
        return stripIndents`
            Use \`${displayPrefix}${this.commandNames[0]}\` to view the animals currently in your crew.

            You can also do \`${displayPrefix}${this.commandNames[0]}\` \`<user id or tag>\` to view another user's crew in this server.
        `;
    }

    public async run(parsedMessage: GuildCommandParser): Promise<void> {
        let player: Player;
        try {
            player = await beastiary.players.fetchByGuildCommandParser(parsedMessage);
        }
        catch (error) {
            if (handleUserError(parsedMessage.channel, error)) {
                throw error;
            }
            return;
        }

        const crewMessage = new CrewMessage(parsedMessage.channel, player);

        try {
            await crewMessage.send();
        }
        catch (error) {
            throw new Error(`There was an error sending a crew message: ${error}`);
        }
    }
}