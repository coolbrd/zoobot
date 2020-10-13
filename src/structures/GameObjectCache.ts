import { Types } from "mongoose";

import CachedValue from "./CachedValue";
import DocumentWrapper from "./DocumentWrapper";

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
    protected async addToCache(value: ValueType, load?: boolean): Promise<void> {
        // Load the value's information by default
        if (load || load === undefined) {
            try {
                await value.load();
            }
            catch (error) {
                throw new Error(`There was an error loading a cached value's information in a cache: ${error}`);
            }
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

    protected getCachedValue(id: Types.ObjectId): CachedValue<ValueType> | undefined {
        return this.cache.get(id.toHexString());
    }

    public getFromCache(id: Types.ObjectId): ValueType | undefined {
        const cachedValue = this.getCachedValue(id);
        if (cachedValue) {
            return cachedValue.value;
        }
        return undefined;
    }
}