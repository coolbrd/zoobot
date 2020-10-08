import PlayerCache from "./PlayerCache";

// The central cache holder/manager for all game objects within The Beastiary
class Beastiary {
    public readonly players = new PlayerCache();
}
export const beastiary = new Beastiary();