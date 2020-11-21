import { stripIndent } from "common-tags";
import { exit } from "..";
import { errorHandler } from "../structures/ErrorHandler";
import AnimalManager from "./AnimalManager";
import ChannelManager from "./ChannelManager";
import EncounterManager from "./EncounterManager";
import PlayerGuildManager from "./PlayerGuildManager";
import PlayerManager from "./PlayerManager";
import ResetManager from "./ResetManager";
import SpeciesManager from "./SpeciesManager";

// The central cache holder/manager for all game object managers within The Beastiary
class Beastiary {
    public readonly players = new PlayerManager();
    public readonly animals = new AnimalManager();
    public readonly playerGuilds = new PlayerGuildManager();
    public readonly species = new SpeciesManager();
    public readonly encounters = new EncounterManager();
    public readonly resets = new ResetManager();
    public readonly channels = new ChannelManager();

    public async exit(): Promise<void> {
        try {
            await this.animals.dumpCache();
            console.log("Animal cache dumped.");
            await this.playerGuilds.dumpCache();
            console.log("Guild cache dumped.");
            await this.players.dumpCache();
            console.log("Player cache dumped.");
            await this.species.dumpCache();
            console.log("Species cache dumped.");
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error dumping all the caches.

                ${error}
            `);
        }

        try {
            await exit();
        }
        catch (error) {
            errorHandler.handleError(error, "There was an error exiting the bot process in the exit command.");
            return;
        }
    }
}
export const beastiary = new Beastiary();