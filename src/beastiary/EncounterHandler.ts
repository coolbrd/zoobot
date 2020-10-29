import { TextChannel } from "discord.js";
import { Document, Types } from "mongoose";
import { SpeciesModel, Species } from "../models/Species";
import EncounterMessage from "../messages/Encountermessage";
import getWeightedRandom from "../utility/getWeightedRandom";
import { beastiary } from "./Beastiary";
import config from "../config/BotConfig";
import { todaysMilliseconds } from "../utility/timeStuff";

// A handler class that deals with creating encounters with species from the total set
// Also respondible for determining the time intervals in which players are rewarded free captures and encounters
class EncounterHandler {
    // The map of ID and rarity pairs that will determine how common each species is
    private rarityMap: Map<Types.ObjectId, number> = new Map();

    // Get the date (time) of the last capture reset
    public get lastCaptureReset(): Date {
        const now = new Date();

        // The number of milliseconds that have passed since the last capture reset
        const millisecondsSinceLastReset = todaysMilliseconds() % config.capturePeriod;

        // The time of the last reset
        return new Date(now.valueOf() - millisecondsSinceLastReset);
    }

    // The date (time) of the next capture reset
    public get nextCaptureReset(): Date {
        return new Date(this.lastCaptureReset.valueOf() + config.capturePeriod);
    }

    // Get the date (time) of the last encounter reset
    public get lastEncounterReset(): Date {
        const now = new Date();

        // The number of milliseconds that have passed since the last encounter reset
        const millisecondsSinceLastReset = todaysMilliseconds() % config.encounterPeriod;

        // The time of the last reset
        return new Date(now.valueOf() - millisecondsSinceLastReset);
    }

    // The date (time) of the next encounter reset
    public get nextEncounterReset(): Date {
        return new Date(this.lastEncounterReset.valueOf() + config.encounterPeriod);
    }

    // Loads/reloads the rarity table from the database
    public async loadRarityTable(): Promise<void> {
        // Get all species and their associated rarity values
        let rarityList: Document[];
        try {
            rarityList = await SpeciesModel.find({}, { [Species.fieldNames.rarity]: 1 });
        }
        catch (error) {
            throw new Error(`There was an error getting all species rarities from the database: ${error}`);
        }

        // Reset the rarity map (useful for reloading the values after already being initialized)
        this.rarityMap = new Map();

        // Add each species to the map
        rarityList.forEach(species => {
            this.rarityMap.set(species._id, species.get("rarity"));
        });
    }

    // Spawn an animal encounter in a given text channel
    public async spawnAnimal(channel: TextChannel): Promise<void> {
        // Don't try to spawn anything if the rarity map is empty
        if (this.rarityMap.size < 1) {
            throw new Error("Tried to spawn an animal before the encounter rarity map was formed.");
        }

        // Get a weighted random species object
        let species: Species;
        try {
            species = await beastiary.species.fetchExistingById(getWeightedRandom(this.rarityMap));
        }
        catch (error) {
            throw new Error(`There was an error getting a species by an id: ${error}`);
        }

        // Send an encounter message to the channel
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