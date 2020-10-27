import getGuildMember from "../discordUtility/getGuildMember";
import { Player } from "../models/Player";
import CommandParser from "../structures/CommandParser";
import UserError from "../structures/UserError";
import { beastiary } from "./Beastiary";

// Extracts a player from a command parser object, using the command sender by default if no player could be found in the specified argument
export default async function parsedCommandToPlayer(parsedUserCommand: CommandParser, argumentIndex?: number, existingOnly?: boolean): Promise<Player> {
    let player: Player;

    // If an argument was specified and the message has enough arguments to allow for checking
    if (argumentIndex !== undefined && parsedUserCommand.arguments.length > argumentIndex) {
        // Get the player that was specified in the argument
        try {
            player = await beastiary.players.fetchByArgument(parsedUserCommand.arguments[argumentIndex], existingOnly);
        }
        catch (error) {
            if (error instanceof UserError) {
                throw error;
            }
            else {
                throw new Error(`There was an error fetching a player by an argument ${error}`);
            }
        }
    }
    // If no argument was specified
    else {
        if (parsedUserCommand.channel.type === "dm") {
            throw new Error("parsedCommandToPlayer was called in a dm channel somehow.");
        }

        // Get (create if necessary) the player of the command sender
        try {
            player = await beastiary.players.fetch(getGuildMember(parsedUserCommand.originalMessage.author, parsedUserCommand.channel));
        }
        catch (error) {
            throw new Error(`There was an error fetching a player in the view crew command: ${error}`);
        }
    }
    
    return player;
} 