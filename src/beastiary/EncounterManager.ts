import { Guild, Message, TextChannel } from "discord.js";
import { Document, Types } from "mongoose";
import { SpeciesModel } from "../models/Species";
import { Species } from "../structures/GameObject/GameObjects/Species";
import EncounterMessage from "../messages/Encountermessage";
import { getWeightedRandom } from "../utility/weightedRarity";
import getFirstAvailableTextChannel from "../discordUtility/getFirstAvailableTextChannel";
import { PlayerGuild } from "../structures/GameObject/GameObjects/PlayerGuild";
import { stripIndent } from "common-tags";
import gameConfig from "../config/gameConfig";
import BeastiaryClient from "../bot/BeastiaryClient";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { inspect } from "util";
import { Animal } from "../structures/GameObject/GameObjects/Animal";

export interface RarityInfo {
    tier: number,
    color: number,
    emojiName: string
}

export default class EncounterManager {
    private rarityTiers = new Map<number, string[]>();

    private readonly guildsOnRandomEncounterCooldown = new Set<string>();
    private readonly currentlyCapturingPlayers = new Set<Player>();

    private readonly beastiaryClient: BeastiaryClient;

    constructor(beastiaryClient: BeastiaryClient) {
        this.beastiaryClient = beastiaryClient;
    }

    public async loadRarityData(): Promise<void> {
        let speciesDocumentList: Document[];
        try {
            speciesDocumentList = await SpeciesModel.find({});
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error getting all species rarities from the database:
                
                ${error}
            `);
        }

        this.rarityTiers = new Map<number, string[]>();

        speciesDocumentList.forEach(currentSpeciesDocument => {
            const currentRarityTier = currentSpeciesDocument.get(Species.fieldNames.rarityTier);

            let rarityList = this.rarityTiers.get(currentRarityTier);

            if (!rarityList) {
                rarityList = [];
                this.rarityTiers.set(currentRarityTier, rarityList);
            }

            rarityList.push((currentSpeciesDocument._id as Types.ObjectId).toHexString());
        });
    }

    private getRandomRarityTier(): number {
        const random = Math.random();
        const startingRarity = 0.5;

        let currentRarity = startingRarity;
        let rarityTier = 0;
        while (random > currentRarity) {
            rarityTier++;

            currentRarity += Math.pow(startingRarity, rarityTier + 1);
        }

        rarityTier = Math.min(this.rarityTiers.size - 1, rarityTier);

        if (!this.rarityTiers.has(rarityTier)) {
            throw new Error(`An invalid rarity tier was selected. Tier: ${rarityTier}`);
        }

        return rarityTier;
    }

    private async getRandomSpecies(player?: Player): Promise<Species> {
        if (this.rarityTiers.size <= 0) {
            throw new Error(stripIndent`Tried to spawn an animal before the encounter rarity map was formed.`);
        }

        const rarityTier = this.getRandomRarityTier();

        const rarityTierList = this.rarityTiers.get(rarityTier);

        if (!rarityTierList) {
            throw new Error(`An undefined rarity tier was chosen when spawning an animal. Tier: ${rarityTier}`);
        }

        const rarityTierMap = new Map<string, number>();
        rarityTierList.forEach(id => rarityTierMap.set(id, 1));

        if (player) {
            player.wishedSpeciesIds.list.forEach(id => {
                const idString = id.toHexString();

                if (rarityTierMap.has(idString)) {
                    rarityTierMap.set(idString, 3);
                }
                else {
                    const nextRarityLevelList = this.rarityTiers.get(rarityTier + 1);
                    if (nextRarityLevelList && nextRarityLevelList.includes(idString)) {
                        rarityTierMap.set(idString, 1);
                    }
                }
            });
        }

        const randomSpeciesId = getWeightedRandom(rarityTierMap);

        let species: Species | undefined;
        try {
            species = await this.beastiaryClient.beastiary.species.fetchById(new Types.ObjectId(randomSpeciesId));
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error getting a species by an id.

                Id: ${randomSpeciesId}
                
                ${error}
            `);
        }

        if (!species) {
            throw new Error(stripIndent`
                An invalid species id was chosen to be spawned randomly.

                Id: ${randomSpeciesId}
            `);
        }

        return species;
    }

    public async spawnAnimal(channel: TextChannel, player?: Player): Promise<void> {
        let species: Species;
        try {
            species = await this.getRandomSpecies(player);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error getting a random species for an encounter.

                ${error}
            `);
        }

        let animal: Animal;
        try {
            animal = await this.beastiaryClient.beastiary.animals.createAnimal(species, species.getRandomCard(), channel.guild.id);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error creating an animal for a random encounter.

                Species: ${species.debugString}
                Channel: ${inspect(channel)}
            `);
        }

        const encounterMessage = new EncounterMessage(channel, this.beastiaryClient, animal, player);
        try {
            await encounterMessage.send();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error sending a new encounter message.

                Channel: ${inspect(channel)}
                Species: ${species.debugString}
                
                ${error}
            `);
        }
    }

    private async fetchGuildEncounterChannel(guild: Guild): Promise<TextChannel | undefined> {
        let playerGuild: PlayerGuild | undefined;
        try {
            playerGuild = await this.beastiaryClient.beastiary.playerGuilds.fetchByGuildId(guild.id);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching a guild by its id.

                Guild id: ${guild.id}
                
                ${error}
            `);
        }

        if (!playerGuild) {
            throw new Error(stripIndent`
                No player guild could be found for a guild id in fetchGuildEncounterChannel.
            `);
        }

        const encounterGuildChannel = playerGuild.encounterGuildChannel;

        let encounterChannel: TextChannel | undefined;
        if (encounterGuildChannel) {
            try {
                encounterChannel = await encounterGuildChannel.fetch() as TextChannel;
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error fetching a text channel from its guild channel.

                    Encounter guild channel: ${inspect(encounterGuildChannel)}
                    
                    ${error}
                `);
            }
        }
        else {
            try {
                encounterChannel = await getFirstAvailableTextChannel(playerGuild.guild);
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error fetching the first available text channel in a guild.

                    ${error}
                `);
            }
        }

        return encounterChannel;
    }

    private applyGuildRandomEncounterCooldown(guild: Guild): void {
        this.guildsOnRandomEncounterCooldown.add(guild.id);

        setTimeout(() => {
            this.guildsOnRandomEncounterCooldown.delete(guild.id);
        }, gameConfig.randomEncounterGuildCooldown);
    }

    public async handleMessage(message: Message): Promise<void> {
        if (!message.guild || message.author.bot) {
            return;
        }

        const guildId = message.guild.id;
        const guildOnCooldown = this.guildsOnRandomEncounterCooldown.has(guildId);

        if (guildOnCooldown) {
            return;
        }

        const spawnChance = Math.random();

        if (spawnChance < gameConfig.randomEncounterChanceOnMessage) {
            let encounterChannel: TextChannel | undefined;
            try {
                encounterChannel = await this.fetchGuildEncounterChannel(message.guild);
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error fetching a guild's random encounter channel.

                    Guild id: ${message.guild.id}

                    ${error}
                `);
            }

            if (!encounterChannel) {
                return;
            }

            let playerGuild: PlayerGuild | undefined;
            try {
                playerGuild = await this.beastiaryClient.beastiary.playerGuilds.fetchByGuildId(guildId);
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error fetching a player guild by its guild id.

                    Guild id: ${guildId}

                    ${error}
                `);
            }

            try {
                await this.spawnAnimal(encounterChannel);
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error spawning an animal after a message was sent.

                    Encounter channel: ${inspect(encounterChannel)}
                    
                    ${error}
                `);
            }

            console.log(`Spawned a random animal encounter in ${message.guild.name}.`);

            this.applyGuildRandomEncounterCooldown(message.guild);
        }
    }
    
    // Gets some visual indication info for any given weighted rarity value
    public getRarityInfo(rarityTier: number): RarityInfo {
        if (rarityTier < 0) {
            throw new Error(`A negative rarity tier was given to getRarityInfo. Tier: ${rarityTier}`);
        }

        const tierColors = [0x557480, 0x49798b, 0x3e6297, 0x2c67a9, 0x1a97bb, 0x0fc6c6, 0x07cd9c, 0x17bd52, 0x417c36, 0xbbae13, 0xf9da04, 0xf3850a, 0xef0e3a, 0xda23c8, 0xff80ff, 0xfffffe];

        let name: string;
        let color: number;
        if (rarityTier >= tierColors.length) {
            name = "tu";
            color = tierColors[tierColors.length - 1];
        }
        else {
            name = `t${rarityTier}`;
            color = tierColors[rarityTier];
        }

        return {
            tier: rarityTier,
            color: color,
            emojiName: name
        }
    }

    public playerIsCapturing(player: Player): boolean {
        return this.currentlyCapturingPlayers.has(player);
    }

    public setPlayerCapturing(player: Player, removeAfter: number): void {
        this.currentlyCapturingPlayers.add(player);

        setTimeout(() => {
            this.unsetPlayerCapturing(player);
        }, removeAfter);
    }

    public unsetPlayerCapturing(player: Player): void {
        this.currentlyCapturingPlayers.delete(player);
    }

    public async testRollSpecies(count: number): Promise<Map<Species, number>> {
        const rolledSpecies = new Map<Species, number>();

        const returnPromises: Promise<void>[] = [];

        for (let i = 0; i < count; i++) {
            const fetchPromise = this.getRandomSpecies().then(species => {
                const count = rolledSpecies.get(species) || 0;

                rolledSpecies.set(species, count + 1);
            });

            returnPromises.push(fetchPromise);
        }

        await Promise.all(returnPromises);

        return rolledSpecies;
    }
}