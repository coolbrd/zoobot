import { GuildMember } from "discord.js";
import { Document, Types } from "mongoose";
import { Player, PlayerObject } from "../models/Player";
import CachedValue from "../structures/CachedItem";

// The cache of player objects within The Beastiary
// The easiest and most efficient way to access player objects
export default class PlayerCache {
    // The current map of cached player objects
    private readonly cachedPlayers = new Map<Types.ObjectId, CachedValue<PlayerObject>>();

    // The inactivity time it takes for a player to get removed from the cache
    private readonly cacheTimeout = 60000;

    // Creates and returns a timeout object used for delaying the deletion of cached players from the cache
    private createNewTimer(player: PlayerObject): NodeJS.Timeout {
        return setTimeout(() => {
            // Remove the cached player from the player cache after the given amount of time
            this.cachedPlayers.delete(player.getId());
        }, this.cacheTimeout);
    }

    // Gets a player object by a given guild member
    public async fetch(guildMember: GuildMember): Promise<PlayerObject> {
        // First check the cache to see if the player's object already exists in it
        for (const cachedPlayer of this.cachedPlayers.values()) {
            // If the current player's information matches the guild member
            if (cachedPlayer.value.getUserId() === guildMember.user.id && cachedPlayer.value.getGuildId() === guildMember.guild.id) {
                // Force the player object to get the most up to date data
                await cachedPlayer.value.refresh();

                // Reset the cached player's deletion timer
                cachedPlayer.setTimer(this.createNewTimer(cachedPlayer.value));

                // Return the existing player from the cache
                return cachedPlayer.value;
            }
        }
        // No matching player exists in the cache
        // Attempt to find a player document with the given information
        let playerDocument: Document | null;
        try {
            playerDocument = await Player.findOne({ userId: guildMember.user.id, guildId: guildMember.guild.id });
        }
        catch (error) {
            throw new Error('There was an error finding an existing player document.');
        }

        let player: PlayerObject;
        // If no player document exists for the given guild member
        if (!playerDocument) {
            // Create a new player object
            player = await this.createNewPlayer(guildMember);
        }

        // If an existing player document was found
        else {
            // Create an object from the document
            player = new PlayerObject({ document: playerDocument });
        }

        // Load the player's information
        await player.load();

        // Add the player to the cache by its document's id
        this.cachedPlayers.set(player.getId(), new CachedValue<PlayerObject>(player, this.createNewTimer(player)));

        // Return the player
        return player;
    }

    // Creates and saves a new player
    private async createNewPlayer(guildMember: GuildMember): Promise<PlayerObject> {
        // Create a new player document
        const playerDocument = new Player({
            userId: guildMember.user.id,
            guildId: guildMember.guild.id
        });

        // Save it
        try {
            await playerDocument.save();
        }
        catch (error) {
            throw new Error('There was an error trying to save a new player document.');
        }

        // Return the new player as an object
        return new PlayerObject({ document: playerDocument });
    }
}
