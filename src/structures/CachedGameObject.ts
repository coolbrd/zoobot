import GameObject from "./GameObject";
import GameObjectCache from "./GameObjectCache";

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

    private startTimer(): NodeJS.Timeout {
        return this.timer = setTimeout(() => {
            this.cache.removeFromCache(this.gameObject.id);
        }, this.timeout);
    }

    public stopTimer(): void {
        clearTimeout(this.timer);
    }

    public resetTimer(): void {
        this.stopTimer();
        this.startTimer();
    }
}