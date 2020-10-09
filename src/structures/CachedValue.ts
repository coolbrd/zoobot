// An item within a cache. Comes with a timer for eventually removing itself from the cache.
export default class CachedValue<T> {
    public readonly value: T;
    private timer: NodeJS.Timeout;

    constructor(item: T, timer: NodeJS.Timeout) {
        this.value = item;
        this.timer = timer;
    }

    // Clears this cached item's current timer, preventing it from firing, and sets it to a new one
    public setTimer(timer: NodeJS.Timeout): void {
        this.stopTimer();
        this.timer = timer;
    }

    public stopTimer(): void {
        clearTimeout(this.timer);
    }
}