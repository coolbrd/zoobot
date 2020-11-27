import { Guild, Message, TextChannel } from "discord.js";
import { Document, Types } from "mongoose";
import { SpeciesModel } from "../models/Species";
import { Species } from "../structures/GameObject/GameObjects/Species";
import EncounterMessage from "../messages/Encountermessage";
import { getWeightedRandom, getWeightedRarityMinimumOccurrence } from "../utility/weightedRarity";
import getFirstAvailableTextChannel from "../discordUtility/getFirstAvailableTextChannel";
import { PlayerGuild } from "../structures/GameObject/GameObjects/PlayerGuild";
import { stripIndent } from "common-tags";
import gameConfig from "../config/gameConfig";
import BeastiaryClient from "../bot/BeastiaryClient";

export interface RarityInfo {
    tier: number,
    color: number,
    emojiName: string
}

export default class EncounterManager {
    private rarityMap: Map<Types.ObjectId, number> = new Map();
    private sortedRarityList: number[] = [];

    private readonly guildsOnRandomEncounterCooldown = new Set<string>();

    private readonly beastiaryClient: BeastiaryClient;

    constructor(beastiaryClient: BeastiaryClient) {
        this.beastiaryClient = beastiaryClient;
    }

    public getTotalRarityWeight(): number {
        let totalRarityWeight = 0;

        for (const currentRarityWeight of this.sortedRarityList) {
            totalRarityWeight += currentRarityWeight;
        }

        return totalRarityWeight;
    }

    public async loadRarityData(): Promise<void> {
        let speciesDocumentList: Document[];
        try {
            speciesDocumentList = await SpeciesModel.find({}, { [Species.fieldNames.rarity]: 1 });
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error getting all species rarities from the database:
                
                ${error}
            `);
        }

        this.rarityMap = new Map();
        const rarityList: number[] = [];

        speciesDocumentList.forEach(currentSpeciesDocument => {
            this.rarityMap.set(currentSpeciesDocument._id, currentSpeciesDocument.get(Species.fieldNames.rarity));

            rarityList.push(currentSpeciesDocument.get(Species.fieldNames.rarity));
        });

        this.sortedRarityList = rarityList.sort((a: number, b: number) => {
            return b - a;
        });
    }

    public getWeightedRarityMinimumOccurrence(weightedRarity: number): number {
        return getWeightedRarityMinimumOccurrence(weightedRarity, this.sortedRarityList);
    }

    public async spawnAnimal(channel: TextChannel): Promise<void> {
        if (this.rarityMap.size < 1) {
            throw new Error(stripIndent`
                Tried to spawn an animal before the encounter rarity map was formed.

                Channel: ${JSON.stringify(channel)}
            `);
        }

        const randomSpeciesId = getWeightedRandom(this.rarityMap);

        let species: Species | undefined;
        try {
            species = await this.beastiaryClient.beastiary.species.fetchById(randomSpeciesId);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error getting a species by an id.

                Id: ${randomSpeciesId}
                Channel: ${JSON.stringify(channel)}
                
                ${error}
            `);
        }

        if (!species) {
            throw new Error(stripIndent`
                An invalid species id was chosen to be spawned randomly.

                Id: ${randomSpeciesId}
                Text channel: ${JSON.stringify(channel)}
            `);
        }

        const encounterMessage = new EncounterMessage(channel, this.beastiaryClient, species);
        try {
            await encounterMessage.send();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error sending a new encounter message.

                Channel: ${JSON.stringify(channel)}
                Species: ${species.debugString}
                
                ${error}
            `);
        }
    }

    private async fetchGuildEncounterChannel(guild: Guild): Promise<TextChannel | undefined> {
        let playerGuild: PlayerGuild;
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

        const encounterGuildChannel = playerGuild.encounterGuildChannel;

        let encounterChannel: TextChannel;
        if (encounterGuildChannel) {
            try {
                encounterChannel = await encounterGuildChannel.fetch() as TextChannel;
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error fetching a text channel from its guild channel.

                    Encounter guild channel: ${JSON.stringify(encounterGuildChannel)}
                    
                    ${error}
                `);
            }
        }
        else {
            let potentialEncounterChannel: TextChannel | undefined
            try {
                potentialEncounterChannel = await getFirstAvailableTextChannel(playerGuild.guild);
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error getting the first available text channel in a guild before spawning an animal.

                    Guild: ${JSON.stringify(playerGuild.guild)}
                    
                    ${error}
                `);
            }

            if (!potentialEncounterChannel) {
                return;
            }

            encounterChannel = potentialEncounterChannel;
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

            try {
                await this.spawnAnimal(encounterChannel);
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error spawning an animal after a message was sent.

                    Encounter channel: ${JSON.stringify(encounterChannel)}
                    
                    ${error}
                `);
            }

            this.applyGuildRandomEncounterCooldown(message.guild);
        }
    }
    
    // Gets some visual indication info for any given weighted rarity value
    public getRarityInfo(rarity: number): RarityInfo {
        const tierColors = [0x557480, 0x49798b, 0x3e6297, 0x2c67a9, 0x1a97bb, 0x0fc6c6, 0x07cd9c, 0x17bd52, 0x417c36, 0xbbae13, 0xf9da04, 0xf3850a, 0xef0e3a, 0xda23c8, 0xff80ff, 0xFFFFFF];
    
        const rarityOccurrence = this.getWeightedRarityMinimumOccurrence(rarity);
    
        let tier = 0;
        while (tier <= tierColors.length - 1) {
            const tierMinimumChance = 1/(Math.pow(2, tier + 1));
    
            if (rarityOccurrence >= tierMinimumChance) {
                return {
                    tier: tier,
                    color: tierColors[tier],
                    emojiName: `t${tier}`
                }
            }
    
            tier += 1;
        }
    
        return {
            tier: tier,
            color: tierColors[tier],
            emojiName: "tu"
        }
    }
}