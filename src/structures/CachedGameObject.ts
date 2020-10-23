import GameObject from "./GameObject";
import GameObjectCache from "./GameObjectCache";

// A game object wrapper class that holds a game object in its respective cache, and deletes it from the cache when appropriate
export default class CachedGameObject<GameObjectType extends GameObject> {
    public readonly gameObject: GameObjectType;

    private readonly timeout: number;
    private readonly cache: GameObjectCache<GameObjectType>;

    private timer: NodeJS.Timeout;

    constructor(gameObject: GameObjectType, timeout: number, cache: GameObjectCache<GameObjectType>) {
        this.gameObject = gameObject;

        this.timeout = timeout;
        this.cache = cache;

        this.timer = this.startTimer();
    }

    // Starts this cached value's timer
    private startTimer(): NodeJS.Timeout {
        return this.timer = setTimeout(() => {
            this.cache.removeFromCache(this.gameObject.id);
        }, this.timeout);
    }

    // Stop the deletion timer
    public stopTimer(): void {
        clearTimeout(this.timer);
    }

    // Clears this cached item's current timer, preventing it from firing, and sets it to a new one
    public resetTimer(): void {
        this.stopTimer();
        this.startTimer();
    }
}