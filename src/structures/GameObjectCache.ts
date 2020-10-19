import { Types } from "mongoose";
import CachedValue from "./CachedValue";
import DocumentWrapper from "./DocumentWrapper";

// A cache of values that specifically extend DocumentWrapper, meaning they have an id
export default class WrapperCache<ValueType extends DocumentWrapper> {
    // The current map of cached objects
    protected readonly cache = new Map<string, CachedValue<ValueType>>();

    // The inactivity time it takes for a value to get removed from the cache
    protected readonly cacheTimeout: number;

    constructor(cacheTimeout: number) {
        this.cacheTimeout = cacheTimeout;
    }

    // Creates and returns a timeout object used for delaying the deletion of cached values from the cache
    protected createNewTimer(value: ValueType): NodeJS.Timeout {
        return setTimeout(() => {
            // Remove the cached value from the cache after the given amount of time
            this.cache.delete(value.id.toHexString());
        }, this.cacheTimeout);
    }

    // Adds a value to the cache
    protected async addToCache(value: ValueType): Promise<void> {
        try {
            await value.load();
        }
        catch (error) {
            throw new Error(`There was an error loading a cached value's information in a cache: ${error}`);
        }
        // Add the value to the cache by its document's id
        this.cache.set(value.id.toHexString(), new CachedValue<ValueType>(value, this.createNewTimer(value)));
    }

    // Removes a value by a given id from the cache
    protected removeFromCache(valueId: Types.ObjectId): void {
        // Get the cached value
        const cachedValue = this.cache.get(valueId.toHexString());

        // Make sure it exists
        if (!cachedValue) {
            throw new Error("Attempted to delete a value that isn't in the specified cache.");
        }

        // Stop the cached removal timer
        cachedValue.stopTimer();

        // Remove the value from the cache
        this.cache.delete(valueId.toHexString());
    }

    // Get a cached value by an ObjectId
    protected getFromCache(id: Types.ObjectId): CachedValue<ValueType> | undefined {
        // Get using the id as its hex string equivalent
        return this.cache.get(id.toHexString());
    }

    // Get the value from a found cached item in the cache
    public getValueFromCache(id: Types.ObjectId): ValueType | undefined {
        // Find the cached item
        const cachedValue = this.getFromCache(id);
        // Return its value, or undefined if no item was found
        if (cachedValue) {
            return cachedValue.value;
        }
        return undefined;
    }
}