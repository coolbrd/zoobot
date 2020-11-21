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
}
export const beastiary = new Beastiary();