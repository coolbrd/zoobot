import { GuildMember } from "discord.js";
import { Document } from "mongoose";
import { PlayerModel, Player } from "../models/Player";
import WrapperCache from "../structures/GameObjectCache";

// The player manager within The Beastiary
// The easiest and most efficient way to access player objects
export default class PlayerManager extends WrapperCache<Player> {
    // Keep players in the cache for at least two minutes
    constructor() {
        super(120000);
    }

    // Check only the cache for a pre-existing player
    private getPlayerFromCache(guildMember: GuildMember): Player | undefined {
        for (const cachedPlayer of this.cache.values()) {
            // If the current player's information matches the guild member
            if (cachedPlayer.value.userId === guildMember.user.id && cachedPlayer.value.guildId === guildMember.guild.id) {
                // Reset the cached player's deletion timer
                cachedPlayer.setTimer(this.createNewTimer(cachedPlayer.value));

                // Return the existing player from the cache
                return cachedPlayer.value;
            }
        }
    }

    // Gets a player's document from only the database, not creating a new one if none is found
    private async getPlayerDocumentFromDatabase(guildMember: GuildMember): Promise<Document | null> {
        let playerDocument: Document | null;
        try {
            playerDocument = await PlayerModel.findOne({ userId: guildMember.user.id, guildId: guildMember.guild.id });
        }
        catch (error) {
            throw new Error(`There was an error finding an existing player document: ${error}`);
        }

        return playerDocument;
    }

    // Gets a player object by a given guild member
    public async fetch(guildMember: GuildMember): Promise<Player> {
        // First check the cache to see if the player's object already exists in it
        const playerInCache = this.getPlayerFromCache(guildMember);
        if (playerInCache) {
            return playerInCache;
        }
        // No matching player exists in the cache

        // Attempt to find a player document with the given information
        const playerDocument = await this.getPlayerDocumentFromDatabase(guildMember);

        let player: Player;
        // If no player document exists for the given guild member
        if (!playerDocument) {
            // Create a new player object
            try {
                player = await this.createNewPlayer(guildMember);
            }
            catch (error) {
                throw new Error(`There was an error creating a new player object: ${error}`);
            }
        }
        // If an existing player document was found
        else {
            // Create an object from the document
            player = new Player(playerDocument);
        }
        
        // Add the player to the cache
        try {
            await this.addToCache(player);
        }
        catch (error) {
            throw new Error(`There was an error adding a player to the cache: ${error}`);
        }

        return player;
    }

    // Creates and saves a new player
    private async createNewPlayer(guildMember: GuildMember): Promise<Player> {
        // Create a new player document
        const playerDocument = new PlayerModel({
            userId: guildMember.user.id,
            guildId: guildMember.guild.id,
            freeCapturesLeft: 0,
            totalCaptures: 0,
            freeEncountersLeft: 0,
            totalEncounters: 0
        });

        // Save it
        try {
            await playerDocument.save();
        }
        catch (error) {
            throw new Error(`There was an error trying to save a new player document: ${error}`);
        }

        // Create the player's object and add it to the cache
        const player = new Player(playerDocument);
        try {
            await this.addToCache(player);
        }
        catch (error) {
            throw new Error(`There was an error adding a player to the cache: ${error}`);
        }

        return player;
    }

    // Determines whether a player exists in the game (has used some kind of database-relevent command)
    public async playerExists(guildMember: GuildMember): Promise<boolean> {
        // Try to get a player object corresponding to the guild member from the cache and the database
        const playerInCache = this.getPlayerFromCache(guildMember);
        let playerDocument: Document | null;
        try {
            playerDocument = await this.getPlayerDocumentFromDatabase(guildMember);
        }
        catch (error) {
            throw new Error(`There was an error getting a player's document from the database.`);
        }

        if (playerInCache || playerDocument) {
            return true;
        }
        return false;
    }
}
