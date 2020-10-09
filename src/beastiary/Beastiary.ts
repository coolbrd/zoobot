import AnimalManager from "./AnimalManager";
import PlayerGuildManager from "./PlayerGuildManager";
import PlayerManager from "./PlayerManager";

// The central cache holder/manager for all game objects within The Beastiary
class Beastiary {
    public readonly players = new PlayerManager();
    public readonly animals = new AnimalManager();
    public readonly playerGuilds = new PlayerGuildManager();
}
export const beastiary = new Beastiary();