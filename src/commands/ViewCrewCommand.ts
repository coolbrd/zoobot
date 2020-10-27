import { stripIndents } from "common-tags";
import { beastiary } from "../beastiary/Beastiary";
import handleUserError from "../discordUtility/handleUserError";
import { betterSend } from "../discordUtility/messageMan";
import CrewMessage from "../messages/CrewMessage";
import { Player } from "../models/Player";
import Command, { CommandSection } from "../structures/Command";
import CommandParser from "../structures/CommandParser";

export default class ViewCrewCommand implements Command {
    public readonly commandNames = ["crew", "cr"];

    public readonly info = "View your current crew of selected animals";

    public readonly section = CommandSection.animalManagement;

    public help(displayPrefix: string): string {
        return stripIndents`
            Use \`${displayPrefix}${this.commandNames[0]}\` to view the animals currently in your crew.

            You can also do \`${displayPrefix}${this.commandNames[0]}\` \`<user id or tag>\` to view another user's crew in this server.
        `;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        // Don't run the command if it's in DMs
        if (parsedUserCommand.channel.type === "dm") {
            betterSend(parsedUserCommand.channel, "The crew command can only be used in servers.");
            return;
        }

        // Get a specified player or the player of the command sender
        let player: Player;
        try {
            player = await beastiary.players.fetchByCommand(parsedUserCommand, 0, true);
        }
        catch (error) {
            if (handleUserError(parsedUserCommand.channel, error)) {
                throw new Error(`There was an error converting a parsed command to a player: ${error}`);
            }
            return;
        }

        const crewMessage = new CrewMessage(parsedUserCommand.channel, player);

        try {
            await crewMessage.send();
        }
        catch (error) {
            throw new Error(`There was an error sending a crew message: ${error}`);
        }
    }
}