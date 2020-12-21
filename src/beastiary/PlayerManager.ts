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

export default class PlayerManager extends GameObjectCache<Player> {
    protected readonly model = PlayerModel;

    protected readonly cacheObjectTimeout = gameConfig.playerCacheTimeout;

    private readonly playerUserIds = new Set<string>();

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

                Guild member: ${JSON.stringify(guildMember)}
                
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

                Guild member: ${JSON.stringify(guildMember)}
                
                ${error}
            `);
        }

        if (!playerDocument) {
            return;
        }

        const player = this.documentToGameObject(playerDocument);
        
        try {
            await this.addToCache(player);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error adding a player to the cache.

                Player document: ${playerDocument.toString()}
                Player: ${player.debugString}
                
                ${error}
            `);
        }

        let hasPremium: boolean;
        try {
            hasPremium = await this.beastiaryClient.beastiary.playerGuilds.hasPremium(player.userId);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error checking if a newly cached player has premium status.

                Player : ${player.debugString}

                ${error}
            `);
        }

        player.playerPremium = hasPremium;

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

                Guild member: ${JSON.stringify(guildMember)}
                
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

                    Guild member: ${JSON.stringify(guildMember)}
                    
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

                Guild member: ${JSON.stringify(guildMember)}

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
                    Parsed message: ${JSON.stringify(parsedMessage)}
                    
                    ${error}
                `);
            }

            if (!existingPlayer) {
                throw new UserError("That user hasn't done anything in The Beastiary yet, so they don't have any information to show. Tell them to catch some animals!");
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

                    Parsed message: ${JSON.stringify(parsedMessage)}
                    
                    ${error}
                `);
            }
        }

        return player;
    }

    private async createNewPlayer(guildMember: GuildMember): Promise<Player> {
        let playerGuild: PlayerGuild;
        try {
            playerGuild = await this.beastiaryClient.beastiary.playerGuilds.fetchByGuildId(guildMember.guild.id);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching a player guild by a guild member's guild id.

                Guild member: ${JSON.stringify(guildMember)}

                ${error}
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

        const player = this.documentToGameObject(playerDocument);

        try {
            await this.addToCache(player);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error adding a player to the cache.

                Player: ${player.debugString}
                
                ${error}
            `);
        }

        this.playerUserIds.add(guildMember.user.id);

        return player;
    }

    public async handleMessage(message: Message): Promise<void> {
        if (message.channel.type !== "text") {
            return;
        }

        const inGuild = Boolean(message.guild);
        const sentByBot = Boolean(message.author.bot);
        const isPlayer = this.playerUserIds.has(message.author.id);

        if (!inGuild || sentByBot || !isPlayer) {
            return;
        }

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
                
                Guild member: ${JSON.stringify(guildMember)}
                Message: ${JSON.stringify(message)}

                ${error}
            `);
        }

        if (!player.getPremium()) {
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
}