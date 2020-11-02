import { Message, TextChannel } from "discord.js";
import { Document, Types } from "mongoose";
import { SpeciesModel, Species } from "../models/Species";
import EncounterMessage from "../messages/Encountermessage";
import getWeightedRandom from "../utility/getWeightedRandom";
import { beastiary } from "./Beastiary";
import { todaysMilliseconds } from "../utility/timeStuff";
import gameConfig from "../config/gameConfig";
import getFirstAvailableTextChannel from "../discordUtility/getFirstAvailableTextChannel";
import { PlayerGuild } from "../models/PlayerGuild";

class EncounterHandler {
    private rarityMap: Map<Types.ObjectId, number> = new Map();

    public get lastCaptureReset(): Date {
        const now = new Date();

        const millisecondsSinceLastReset = todaysMilliseconds() % gameConfig.capturePeriod;

        return new Date(now.valueOf() - millisecondsSinceLastReset);
    }

    public get nextCaptureReset(): Date {
        return new Date(this.lastCaptureReset.valueOf() + gameConfig.capturePeriod);
    }

    public get lastEncounterReset(): Date {
        const now = new Date();

        const millisecondsSinceLastReset = todaysMilliseconds() % gameConfig.encounterPeriod;

        return new Date(now.valueOf() - millisecondsSinceLastReset);
    }

    public get nextEncounterReset(): Date {
        return new Date(this.lastEncounterReset.valueOf() + gameConfig.encounterPeriod);
    }

    public getTotalRarityWeight(): number {
        let totalRarityWeight = 0;

        for (const currentRarityWeight of this.rarityMap.values()) {
            totalRarityWeight += currentRarityWeight;
        }

        return totalRarityWeight;
    }

    public async loadRarityTable(): Promise<void> {
        let rarityList: Document[];
        try {
            rarityList = await SpeciesModel.find({}, { [Species.fieldNames.rarity]: 1 });
        }
        catch (error) {
            throw new Error(`There was an error getting all species rarities from the database: ${error}`);
        }

        this.rarityMap = new Map();

        rarityList.forEach(species => {
            this.rarityMap.set(species._id, species.get("rarity"));
        });
    }

    public async spawnAnimal(channel: TextChannel): Promise<void> {
        if (this.rarityMap.size < 1) {
            throw new Error("Tried to spawn an animal before the encounter rarity map was formed.");
        }

        let species: Species;
        try {
            species = await beastiary.species.fetchById(getWeightedRandom(this.rarityMap));
        }
        catch (error) {
            throw new Error(`There was an error getting a species by an id: ${error}`);
        }

        const encounterMessage = new EncounterMessage(channel, species);
        try {
            await encounterMessage.send();
        }
        catch (error) {
            throw new Error(`There was an error sending a new encounter message: ${error}`);
        }
    }

    public async handleMessage(message: Message): Promise<void> {
        if (!message.guild || message.author.bot) {
            return;
        }

        const spawnChance = Math.random();
        if (spawnChance < 0.1) {
            let playerGuild: PlayerGuild;
            try {
                playerGuild = await beastiary.playerGuilds.fetchByGuildId(message.guild.id);
            }
            catch (error) {
                throw new Error(`There was an error fetching a guild by its id: ${error}`);
            }

            let encounterChannel: TextChannel;
            const encounterGuildChannel = playerGuild.encounterGuildChannel;
            if (encounterGuildChannel) {
                try {
                    encounterChannel = await encounterGuildChannel.fetch() as TextChannel;
                }
                catch (error) {
                    throw new Error(`There was an error fetching a text channel from its guild channel: ${error}`);
                }
            }
            else {
                let potentialEncounterChannel: TextChannel | undefined
                try {
                    potentialEncounterChannel = await getFirstAvailableTextChannel(playerGuild.guild);
                }
                catch (error) {
                    throw new Error(`There was an error getting the first available text channel in a guild before spawning an animal: ${error}`);
                }

                if (!potentialEncounterChannel) {
                    return;
                }

                encounterChannel = potentialEncounterChannel;
            }

            try {
                await this.spawnAnimal(encounterChannel);
            }
            catch (error) {
                throw new Error(`There was an error spawning an animal after a message was sent: ${error}`);
            }
        }
    }
}
export const encounterHandler = new EncounterHandler();