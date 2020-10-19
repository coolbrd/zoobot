import AnimalManager from "./AnimalManager";
import PlayerGuildManager from "./PlayerGuildManager";
import PlayerManager from "./PlayerManager";
import SpeciesManager from "./SpeciesManager";

// The central cache holder/manager for all game object managers within The Beastiary
class Beastiary {
    public readonly players = new PlayerManager();
    public readonly animals = new AnimalManager();
    public readonly playerGuilds = new PlayerGuildManager();
    public readonly species = new SpeciesManager();
}
export const beastiary = new Beastiary();