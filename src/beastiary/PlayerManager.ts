import { Guild, GuildMember, Message } from "discord.js";
import { Document } from "mongoose";
import gameConfig from "../config/gameConfig";
import getGuildMember from "../discordUtility/getGuildMember";
import { PlayerModel } from "../models/Player";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import GameObjectCache from "../structures/GameObject/GameObjectCache";
import UserError from "../structures/UserError";
import { stripIndent } from "common-tags";
import { PlayerGuild } from "../structures/GameObject/GameObjects/PlayerGuild";
import { inspect } from "util";

export default class PlayerManager extends GameObjectCache<Player> {
    protected readonly model = PlayerModel;

    protected readonly cacheObjectTimeout = gameConfig.cachedGameObjectTimeout;

    private readonly playerUserIds = new Set<string>();

    private readonly userRecentMessageCounts = new Map<string, number>();

    protected documentToGameObject(document: Document): Player {
        return new Player(document, this.beastiaryClient);
    }

    public async init(): Promise<void> {
        let playerDocuments: Document[];
        try {
            playerDocuments = await PlayerModel.find({}, { [Player.fieldNames.userId]: 1 });
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error getting all player documents from the database.
                
                ${error}
            `);
        }

        for (const playerDocument of playerDocuments) {
            this.playerUserIds.add(playerDocument.get(Player.fieldNames.userId));
        }

        setInterval(() => {
            this.userRecentMessageCounts.clear();
        }, 180000);
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
            throw new Error(stripIndent`
                There was an error finding an existing player document.

                Guild member: ${inspect(guildMember)}
                
                ${error}
            `);
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
            throw new Error(stripIndent`
                There was an error getting a player document by a guild member.

                Guild member: ${inspect(guildMember)}
                
                ${error}
            `);
        }

        if (!playerDocument) {
            return;
        }

        let player: Player;
        try {
            player = await this.addDocumentToCache(playerDocument);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error adding a player document to the cache.

                Player document: ${playerDocument.toString()}
                
                ${error}
            `);
        }

        return player;
    }

    public async fetch(guildMember: GuildMember): Promise<Player> {
        let player: Player | undefined;
        try {
            player = await this.fetchExisting(guildMember);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching an existing player from the cache.

                Guild member: ${inspect(guildMember)}
                
                ${error}
            `);
        }

        if (!player) {
            try {
                player = await this.createNewPlayer(guildMember);
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error creating a new player object.

                    Guild member: ${inspect(guildMember)}
                    
                    ${error}
                `);
            }
        }

        return player;
    }

    public async safeFetch(guildMember: GuildMember): Promise<Player> {
        let player: Player;
        try {
            player = await this.fetch(guildMember);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching a player by a guild member.

                Guild member: ${inspect(guildMember)}

                ${error}
            `);
        }

        return player;
    }

    public async fetchByGuildCommandParser(parsedMessage: GuildCommandParser): Promise<Player> {
        let player: Player;

        if (parsedMessage.currentArgument) {
            const potentialGuildMemberArgument = parsedMessage.currentArgument;

            if (!potentialGuildMemberArgument.member) {
                throw new UserError(`No user with the id \`${potentialGuildMemberArgument.text}\` exists in this server.`);
            }

            const targetGuildMember = potentialGuildMemberArgument.member;

            let existingPlayer: Player | undefined;
            try {
                existingPlayer = await this.beastiaryClient.beastiary.players.fetchExisting(targetGuildMember);
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error fetching an existing player by a guild member in the view collection command.

                    Guild member: ${targetGuildMember.toString()}
                    Parsed message: ${inspect(parsedMessage)}
                    
                    ${error}
                `);
            }

            if (!existingPlayer) {
                throw new UserError("That user hasn't done anything in The Beastiary yet, so they can't be targeted by any commands. Tell them to catch some animals!");
            }

            player = existingPlayer;
        }
        else {
            try {
                player = await this.beastiaryClient.beastiary.players.fetch(parsedMessage.member);
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error fetching a player by the guild member of a message sender.

                    Parsed message: ${inspect(parsedMessage)}
                    
                    ${error}
                `);
            }
        }

        return player;
    }

    public async getAllPlayersByIds(options: { userId?: string, guildId?: string }): Promise<Player[]> {
        if (!options.userId && !options.guildId) {
            throw new Error("Either a user or guild id must be provided when getting all players by one/both of those criteria.");
        }

        const search = {};

        if (options.userId) {
            Object.defineProperty(search, Player.fieldNames.userId, {
                writable: false,
                enumerable: true,
                value: options.userId
            });
        }

        if (options.guildId) {
            Object.defineProperty(search, Player.fieldNames.guildId, {
                writable: false,
                enumerable: true,
                value: options.guildId
            });
        }

        let playerDocuments: Document[];
        try {
            playerDocuments = await PlayerModel.find(search);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error getting all player documents by user id and/or guild id.

                ${error}
            `);
        }

        const addPromises: Promise<Player | undefined>[] = [];

        for (const playerDocument of playerDocuments) {
            const addPromise = this.addDocumentToCache(playerDocument).catch(() => undefined);

            addPromises.push(addPromise);
        }

        const potentialPlayers = await Promise.all(addPromises);

        const players: Player[] = potentialPlayers.filter(potentialPlayer => potentialPlayer !== undefined) as Player[];

        return players;
    }

    private async createNewPlayer(guildMember: GuildMember): Promise<Player> {
        let playerGuild: PlayerGuild | undefined;
        try {
            playerGuild = await this.beastiaryClient.beastiary.playerGuilds.fetchByGuildId(guildMember.guild.id);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching a player guild by a guild member's guild id.

                Guild member: ${inspect(guildMember)}

                ${error}
            `);
        }

        if (!playerGuild) {
            throw new Error(stripIndent`
                No player guild could be found for a newly created player.
            `);
        }

        const playerDocument = Player.newDocument(guildMember, playerGuild)

        try {
            await playerDocument.save();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error trying to save a new player document.

                Player document: ${playerDocument.toString()}
                
                ${error}
            `);
        }

        let player: Player;
        try {
            player = await this.addDocumentToCache(playerDocument);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error adding a player document to the cache.

                Player document: ${playerDocument.toString()}
                
                ${error}
            `);
        }

        this.playerUserIds.add(guildMember.user.id);

        return player;
    }

    private incrementUserMessagesSent(userId: string): void {
        const count = this.userRecentMessageCounts.get(userId) || 0;

        this.userRecentMessageCounts.set(userId, count + 1);
    }

    private userAtMessageCap(userId: string): boolean {
        const messageCount = this.userRecentMessageCounts.get(userId) || 0;

        return messageCount >= 20;
    }

    public async handleMessage(message: Message): Promise<void> {
        if (message.channel.type !== "GUILD_TEXT") {
            return;
        }

        const inGuild = Boolean(message.guild);
        const sentByBot = Boolean(message.author.bot);
        const isPlayer = this.playerUserIds.has(message.author.id);
        const atMessageCap = this.userAtMessageCap(message.author.id);

        if (!inGuild || sentByBot || !isPlayer || atMessageCap) {
            return;
        }

        this.incrementUserMessagesSent(message.author.id);

        const guild = message.guild as Guild;

        let guildMember: GuildMember | undefined;
        try {
            guildMember = await getGuildMember(message.author.id, guild.id, this.beastiaryClient);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error getting a guild member by a player's information.

                User id: ${message.author.id}
                Guild id: ${guild.id}

                ${error}
            `);
        }

        if (!guildMember) {
            throw new Error(stripIndent`
                No guild member could be found for a message's sender information.

                User id: ${message.author.id}
                Guild id: ${guild.id}
            `);
        }

        let player: Player;
        try {
            player = await this.beastiaryClient.beastiary.players.fetch(guildMember);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching a player after they sent a message.
                
                Guild member: ${inspect(guildMember)}
                Message: ${inspect(message)}

                ${error}
            `);
        }

        if (!player.premium) {
            return;
        }

        try {
            await player.awardCrewExperienceInChannel(gameConfig.xpPerMessage, message.channel);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error awarding a player's crew of animals some experience after a message was sent.

                Player: ${player.debugString}
            `);
        }
    }

    public async handleVote(userId: string, count = 1): Promise<void> {
        let players: Player[];
        try {
            players = await this.getAllPlayersByIds({ userId: userId });
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching all available players by a user id after receiving a vote.
            `);
        }

        if (players.length > 0) {
            const player = players[0];

            if (player.member) {
                console.log(`${player.member.user.tag} voted!`);
            }
        }
        else {
            console.log(`No players were found after a user id voted: ${userId}`);
        }

        for (const player of players) {
            player.prizeBalls += count;
            if (player.member) {
                console.log(`Gave ${player.member.user.tag} in '${player.member.guild.name}' ${count} prize balls.`);
            }
            else {
                console.log(`Gave a player with an unknown member ${count} prize balls.`);
            }
        }
    }
}