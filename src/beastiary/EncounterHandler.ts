import { TextChannel } from "discord.js";
import { Document, Types } from "mongoose";
import { SpeciesModel, Species } from "../models/Species";
import EncounterMessage from "../messages/Encountermessage";
import getWeightedRandom from "../utility/getWeightedRandom";
import { beastiary } from "./Beastiary";
import { todaysMilliseconds } from "../utility/timeStuff";
import gameConfig from "../config/gameConfig";

class EncounterHandler {
    private rarityMap: Map<Types.ObjectId, number> = new Map();

    public get lastCaptureReset(): Date {
        const now = new Date();

        // The number of milliseconds that have passed since the last capture reset
        const millisecondsSinceLastReset = todaysMilliseconds() % gameConfig.capturePeriod;

        // The time of the last reset
        return new Date(now.valueOf() - millisecondsSinceLastReset);
    }

    public get nextCaptureReset(): Date {
        return new Date(this.lastCaptureReset.valueOf() + gameConfig.capturePeriod);
    }

    public get lastEncounterReset(): Date {
        const now = new Date();

        // The number of milliseconds that have passed since the last encounter reset
        const millisecondsSinceLastReset = todaysMilliseconds() % gameConfig.encounterPeriod;

        // The time of the last reset
        return new Date(now.valueOf() - millisecondsSinceLastReset);
    }

    public get nextEncounterReset(): Date {
        return new Date(this.lastEncounterReset.valueOf() + gameConfig.encounterPeriod);
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
}
export const encounterHandler = new EncounterHandler();