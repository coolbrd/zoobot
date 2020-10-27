import { stripIndents } from "common-tags";
import { GuildMember } from "discord.js";
import { beastiary } from "../beastiary/Beastiary";
import getGuildMember from "../discordUtility/getGuildMember";
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

        // The guild member whose crew will be displayed
        let specifiedMember: GuildMember;
        // If the user provided an argument (presumably the user whose crew they want to view)
        if (parsedUserCommand.arguments.length > 0) {
            const playerArgument = parsedUserCommand.arguments[0];

            if (!playerArgument.member) {
                betterSend(parsedUserCommand.channel, "No user with that id exists in this server.");
                return;
            }

            // Determine whether or not the specified player exists in The Beastiary
            let playerExists: boolean;
            try {
                playerExists = await beastiary.players.playerExists(playerArgument.member);
            }
            catch (error) {
                throw new Error(`There was an error checking if a player exists in the view crew command: ${error}`);
            }

            // If no player exists for the guild member, don't create a new one
            if (!playerExists) {
                betterSend(parsedUserCommand.channel, "That user has yet to become a player in The Beastiary, tell them to catch some animals!");
                return;
            }

            specifiedMember = playerArgument.member;
        }
        // If no arguments were provided
        else {
            specifiedMember = getGuildMember(parsedUserCommand.originalMessage.author, parsedUserCommand.channel);
        }

        // Get the player object of the target member
        let targetPlayer: Player;
        try {
            targetPlayer = await beastiary.players.fetch(specifiedMember);
        }
        catch (error) {
            throw new Error(`There was an error fetching a specified player in the view collection command: ${error}`);
        }

        const crewMessage = new CrewMessage(parsedUserCommand.channel, targetPlayer);

        try {
            await crewMessage.send();
        }
        catch (error) {
            throw new Error(`There was an error sending a crew message: ${error}`);
        }
    }
}