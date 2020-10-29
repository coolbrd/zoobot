import { GuildMember, Message } from "discord.js";
import { Document } from "mongoose";
import config from "../config/BotConfig";
import getGuildMember from "../discordUtility/getGuildMember";
import { Animal } from "../models/Animal";
import { PlayerModel, Player } from "../models/Player";
import { Argument, GuildCommandParser } from "../structures/CommandParser";
import GameObjectCache from "../structures/GameObjectCache";
import UserError from "../structures/UserError";
import { beastiary } from "./Beastiary";

// The player manager within The Beastiary
// The easiest and most efficient way to access player objects
export default class PlayerManager extends GameObjectCache<Player> {
    protected readonly model = PlayerModel;

    protected readonly cacheTimeout = 300000;

    private readonly playerUserIds = new Set<string>();

    protected documentToGameObject(document: Document): Player {
        return new Player(document);
    }

    public async init(): Promise<void> {
        let playerDocuments: Document[];
        try {
            playerDocuments = await PlayerModel.find({}, { userId: 1 });
        }
        catch (error) {
            throw new Error(`There was an error getting all player documents from the database: ${error}`);
        }

        for (const playerDocument of playerDocuments) {
            this.playerUserIds.add(playerDocument.get("userId"));
        }
    }

    // Check only the cache for a pre-existing player
    private getFromCacheByGuildMember(guildMember: GuildMember): Player | undefined {
        for (const cachedPlayer of this.cache.values()) {
            // If the current player's information matches the guild member
            if (cachedPlayer.gameObject.userId === guildMember.user.id && cachedPlayer.gameObject.guildId === guildMember.guild.id) {
                // Reset the cached player's deletion timer
                cachedPlayer.resetTimer();

                // Return the existing player from the cache
                return cachedPlayer.gameObject;
            }
        }
    }

    // Gets a player's document from only the database, not creating a new one if none is found
    private async getPlayerDocument(guildMember: GuildMember): Promise<Document | null> {
        let playerDocument: Document | null;
        try {
            playerDocument = await PlayerModel.findOne({ userId: guildMember.user.id, guildId: guildMember.guild.id });
        }
        catch (error) {
            throw new Error(`There was an error finding an existing player document: ${error}`);
        }

        return playerDocument;
    }

    public async fetchExisting(guildMember: GuildMember): Promise<Player | undefined> {
        // First check the cache to see if the player's object already exists in it
        const playerInCache = this.getFromCacheByGuildMember(guildMember);

        if (playerInCache) {
            return playerInCache;
        }
        // No matching player exists in the cache

        // Attempt to find a player document with the given information
        const playerDocument = await this.getPlayerDocument(guildMember);

        // If no player document exists for the given guild member, return nothing
        if (!playerDocument) {
            return;
        }

        // Create an object from the document
        const player = this.documentToGameObject(playerDocument);
        
        // Add the player to the cache
        try {
            await this.addToCache(player);
        }
        catch (error) {
            throw new Error(`There was an error adding a player to the cache: ${error}`);
        }

        return player;
    }

    // Gets a player object by a given guild member
    public async fetch(guildMember: GuildMember): Promise<Player> {
        let player: Player | undefined;
        try {
            player = await this.fetchExisting(guildMember);
        }
        catch (error) {
            throw new Error(`There was an error fetching an existing player from the cache: ${error}`);
        }

        if (!player) {
            try {
                player = await this.createNewPlayer(guildMember);
            }
            catch (error) {
                throw new Error(`There was an error creating a new player object: ${error}`);
            }
        }

        return player;
    }

    // Takes a parsed command's argument and attempts to resolve it into a player object
    public async fetchByArgument(argument: Argument, existingOnly?: boolean): Promise<Player> {
        // If the argument didn't specify a guild member
        if (!argument.member) {
            throw new UserError("No user with that id exists in this server.");
        }

        // Get a pre-existing player within The Beastiary
        let player: Player | undefined;
        try {
            player = await beastiary.players.fetchExisting(argument.member);
        }
        catch (error) {
            throw new Error(`There was an error getting an existing player in fetchByArgument: ${error}`);
        }

        // If no player exists for the guild member
        if (!player) {
            // If only existing players are being searched
            if (existingOnly) {
                throw new UserError("That user has yet to become a player in The Beastiary, tell them to catch some animals!");
            }
            // If searching a valid member should always return a player
            else {
                // Create a new player for the guild member
                player = await this.createNewPlayer(argument.member);
            }
        }

        return player;
    }

    // Creates and saves a new player
    private async createNewPlayer(guildMember: GuildMember): Promise<Player> {
        // Create a new player document
        const playerDocument = Player.newDocument(guildMember)

        // Save it
        try {
            await playerDocument.save();
        }
        catch (error) {
            throw new Error(`There was an error trying to save a new player document: ${error}`);
        }

        // Create the player's object and add it to the cache
        const player = this.documentToGameObject(playerDocument);
        try {
            await this.addToCache(player);
        }
        catch (error) {
            throw new Error(`There was an error adding a player to the cache: ${error}`);
        }

        // Add the new player's user id to the list of all player user ids in memory
        this.playerUserIds.add(guildMember.user.id);

        return player;
    }

    // Determines whether a player exists in the game (has used some kind of database-relevent command)
    public async playerExists(guildMember: GuildMember): Promise<boolean> {
        // Try to get a player object corresponding to the guild member from the cache and the database
        const playerInCache = this.getFromCacheByGuildMember(guildMember);

        let playerDocument: Document | null;
        try {
            playerDocument = await this.getPlayerDocument(guildMember);
        }
        catch (error) {
            throw new Error(`There was an error getting a player's document from the database.`);
        }

        if (playerInCache || playerDocument) {
            return true;
        }
        return false;
    }

    // Extracts a player from a command parser object, using the command sender by default if no player could be found in the specified argument
    public async fetchByCommand(parsedMessage: GuildCommandParser, argumentIndex?: number, existingOnly?: boolean): Promise<Player> {
        let player: Player;

        // If an argument was specified and the message has enough arguments to allow for checking
        if (argumentIndex !== undefined && parsedMessage.arguments.length > argumentIndex) {
            // Get the player that was specified in the argument
            try {
                player = await this.fetchByArgument(parsedMessage.arguments[argumentIndex], existingOnly);
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
            // Get (create if necessary) the player of the command sender
            try {
                player = await this.fetch(getGuildMember(parsedMessage.sender, parsedMessage.guild));
            }
            catch (error) {
                throw new Error(`There was an error fetching a player by a command: ${error}`);
            }
        }
        
        return player;
    } 

    // Applies experience to players with animals in their crew
    public async handleMessage(message: Message): Promise<void> {
        // Don't continue if the message is in dms, was sent by a bot, or by somebody who isn't a player in the game
        if (!message.guild || message.author.bot || !this.playerUserIds.has(message.author.id)) {
            return;
        }

        // Get the player that sent the message
        let player: Player;
        try {
            player = await beastiary.players.fetch(getGuildMember(message.author, message.guild));
        }
        catch (error) {
            throw new Error(`There was an error fetching a player after they sent a message: ${error}`);
        }

        // Get the animals in the player's crew
        const crewAnimals: Animal[] = [];
        try {
            await new Promise(resolve => {
                let completed = 0;
                for (const animalId of player.crewAnimalIds) {
                    beastiary.animals.fetchById(animalId).then(animal => {
                        crewAnimals.push(animal);

                        if (++completed >= player.crewAnimalIds.length) {
                            resolve();
                        }
                    }).catch(error => {
                        throw new Error(`There was an error fetching a player's crew animal by its id: ${error}`);
                    });
                }
            })
        }
        catch (error) {
            throw new Error(`There was an error bulk fetching a player's crew animals: ${error}`);
        }

        // Give each animal some experience
        for (const crewAnimal of crewAnimals) {
            crewAnimal.experience += config.experiencePerMessage;
        }
    }
}
