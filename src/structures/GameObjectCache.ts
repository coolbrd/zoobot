import { Document, Model, Types } from "mongoose";
import CachedGameObject from "./CachedGameObject";
import GameObject from "./GameObject";

// A cache of GameObjects
export default abstract class GameObjectCache<GameObjectType extends GameObject> {
    // The model in which game object's documents will be found
    protected readonly abstract model: Model<Document>;

    // The inactivity time it takes for an object to get removed from the cache
    protected readonly abstract cacheTimeout: number;

    // The current map of cached objects
    protected readonly cache = new Map<string, CachedGameObject<GameObjectType>>();

    // Get a cached value by an ObjectId
    protected getCachedGameObject(id: Types.ObjectId): CachedGameObject<GameObjectType> | undefined {
        // Get using the id as its hex string equivalent
        const cachedGameObject = this.cache.get(id.toHexString());

        // If a game object was found, reset its timer
        if (cachedGameObject) {
            cachedGameObject.resetTimer();
        }
        return cachedGameObject;
    }

    // Get the value from a found cached item in the cache
    public getFromCache(id: Types.ObjectId): GameObjectType | undefined {
        // Find the cached item
        const cachedValue = this.getCachedGameObject(id);
        // Return its value, or undefined if no item was found
        if (cachedValue) {
            return cachedValue.gameObject;
        }
        return undefined;
    }

    // Adds a value to the cache
    protected async addToCache(value: GameObjectType): Promise<void> {
        // Load the cached value's information
        try {
            await value.load();
        }
        catch (error) {
            throw new Error(`There was an error loading a cached value's information in a cache: ${error}`);
        }

        // Create a new cached value that will remove itself from this cache in a set amount of time
        const newCachedValue = new CachedGameObject<GameObjectType>(value, this.cacheTimeout, this);

        // Add the value to the cache by its document's id
        this.cache.set(value.id.toHexString(), newCachedValue);
    }

    // Removes a value by a given id from the cache
    public async removeFromCache(valueId: Types.ObjectId): Promise<void> {
        // Get the cached object
        const cachedGameObject = this.cache.get(valueId.toHexString());

        // Make sure it exists
        if (!cachedGameObject) {
            throw new Error("Attempted to delete a value that isn't in the specified cache.");
        }

        // Stop the cache removal timer
        cachedGameObject.stopTimer();

        // Tell the game object to finalize everything before it's removed from memory
        try {
            await cachedGameObject.gameObject.finalize();
        }
        catch (error) {
            throw new Error(`There was an error finalizing a game object before it was removed from its cache: ${error}`);
        }

        // Remove the value from the cache
        this.cache.delete(valueId.toHexString());
    }

    // Converts a given document into a game object of the subclassed type
    protected abstract documentToGameObject(document: Document): GameObjectType;

    // Gets an existing game object from either the cache or the database
    public async fetchById(id: Types.ObjectId): Promise<GameObjectType> {
        const cachedGameObject = this.getCachedGameObject(id);

        if (cachedGameObject) {
            return cachedGameObject.gameObject;
        }

        let gameObjectDocument: Document | null;
        try {
            gameObjectDocument = await this.model.findById(id);
        }
        catch (error) {
            throw new Error(`There was an error fetching a game object's document in a cache by its id: ${error}`);
        }

        if (gameObjectDocument) {
            const gameObject = this.documentToGameObject(gameObjectDocument);
            try {
                await this.addToCache(gameObject);
            }
            catch (error) {
                throw new Error(`There was an error adding a game object to the cache after finding it by its id: ${error}`);
            }

            return gameObject;
        }
        else {
            throw new Error("An id with no matching document was fetched in a game object cache.");
        }
    }
}