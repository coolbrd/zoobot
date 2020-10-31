import { Guild, GuildMember, Message } from "discord.js";
import { Document } from "mongoose";
import gameConfig from "../config/gameConfig";
import getGuildMember from "../discordUtility/getGuildMember";
import { PlayerModel, Player } from "../models/Player";
import { GuildCommandParser } from "../structures/CommandParser";
import GameObjectCache from "../structures/GameObjectCache";
import UserError from "../structures/UserError";
import { beastiary } from "./Beastiary";

export default class PlayerManager extends GameObjectCache<Player> {
    protected readonly model = PlayerModel;

    protected readonly cacheObjectTimeout = gameConfig.playerCacheTimeout;

    private readonly playerUserIds = new Set<string>();

    protected documentToGameObject(document: Document): Player {
        return new Player(document);
    }

    public async init(): Promise<void> {
        let playerDocuments: Document[];
        try {
            playerDocuments = await PlayerModel.find({}, { [Player.fieldNames.userId]: 1 });
        }
        catch (error) {
            throw new Error(`There was an error getting all player documents from the database: ${error}`);
        }

        for (const playerDocument of playerDocuments) {
            this.playerUserIds.add(playerDocument.get(Player.fieldNames.userId));
        }
    }

    private getCachedPlayerByGuildMember(guildMember: GuildMember): Player | undefined {
        return this.getMatchingFromCache(player => {
            const matchesUser = player.userId === guildMember.user.id;
            const matchesGuild = player.guildId === guildMember.guild.id;

            return matchesUser && matchesGuild;
        });
    }

    private async getPlayerDocumentByGuildMember(guildMember: GuildMember): Promise<Document | null> {
        let playerDocument: Document | null;
        try {
            playerDocument = await PlayerModel.findOne({
                [Player.fieldNames.userId]: guildMember.user.id,
                [Player.fieldNames.guildId]: guildMember.guild.id
            });
        }
        catch (error) {
            throw new Error(`There was an error finding an existing player document: ${error}`);
        }

        return playerDocument;
    }

    public async fetchExisting(guildMember: GuildMember): Promise<Player | undefined> {
        const cachedPlayer = this.getCachedPlayerByGuildMember(guildMember);

        if (cachedPlayer) {
            return cachedPlayer;
        }

        let playerDocument: Document | null;
        try {
            playerDocument = await this.getPlayerDocumentByGuildMember(guildMember);
        }
        catch (error) {
            throw new Error(`There was an error getting a player document by a guild member: ${error}`);
        }

        if (!playerDocument) {
            return;
        }

        const player = this.documentToGameObject(playerDocument);
        
        try {
            await this.addToCache(player);
        }
        catch (error) {
            throw new Error(`There was an error adding a player to the cache: ${error}`);
        }

        return player;
    }

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

    public async fetchByGuildCommandParser(parsedMessage: GuildCommandParser): Promise<Player> {
        let player: Player;

        if (parsedMessage.arguments.length > 0) {
            const potentialGuildMemberArgument = parsedMessage.arguments[0];

            if (!potentialGuildMemberArgument.member) {
                throw new UserError(`No user with the id \`${potentialGuildMemberArgument.text}\` exists in this server.`);
            }

            const targetGuildMember = potentialGuildMemberArgument.member;

            let existingPlayer: Player | undefined;
            try {
                existingPlayer = await beastiary.players.fetchExisting(targetGuildMember);
            }
            catch (error) {
                throw new Error(`There was an error fetching an existing player by a guild member in the view collection command: ${error}`);
            }

            if (!existingPlayer) {
                throw new UserError("That user hasn't done anything in The Beastiary yet, so they don't have any information to show. Tell them to catch some animals!");
            }

            player = existingPlayer;
        }
        else {
            try {
                player = await beastiary.players.fetch(parsedMessage.member);
            }
            catch (error) {
                throw new Error(`There was an error fetching a player by the guild member of a message sender: ${error}`);
            }
        }

        return player;
    }

    private async createNewPlayer(guildMember: GuildMember): Promise<Player> {
        const playerDocument = Player.newDocument(guildMember)

        try {
            await playerDocument.save();
        }
        catch (error) {
            throw new Error(`There was an error trying to save a new player document: ${error}`);
        }

        const player = this.documentToGameObject(playerDocument);

        try {
            await this.addToCache(player);
        }
        catch (error) {
            throw new Error(`There was an error adding a player to the cache: ${error}`);
        }

        this.playerUserIds.add(guildMember.user.id);

        return player;
    }

    public async handleMessage(message: Message): Promise<void> {
        const inGuild = Boolean(message.guild);
        const sentByBot = Boolean(message.author.bot);
        const isPlayer = this.playerUserIds.has(message.author.id);

        if (!inGuild || sentByBot || !isPlayer) {
            return;
        }

        const guild = message.guild as Guild;

        let player: Player;
        try {
            player = await beastiary.players.fetch(getGuildMember(message.author, guild));
        }
        catch (error) {
            throw new Error(`There was an error fetching a player after they sent a message: ${error}`);
        }

        try {
            await player.awardCrewExperience(gameConfig.experiencePerMessage);
        }
        catch (error) {
            throw new Error(`There was an error awarding a player's crew of animals some experience after a message was sent.`);
        }
    }
}
