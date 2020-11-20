import { stripIndent } from "common-tags";
import { Document, Model, Types } from "mongoose";
import CachedGameObject from "./CachedGameObject";
import GameObject from "./GameObject";

export default abstract class GameObjectCache<GameObjectType extends GameObject> {
    // The model in which game object's documents will be found
    protected abstract readonly model: Model<Document>;

    protected abstract readonly cacheObjectTimeout: number;

    protected abstract documentToGameObject(document: Document): GameObjectType;

    private readonly cache = new Map<string, CachedGameObject<GameObjectType>>();

    private newCacheObject(gameObject: GameObjectType): CachedGameObject<GameObjectType> {
        return new CachedGameObject(gameObject, this.cacheObjectTimeout, this);
    }

    private idToCacheKey(gameObjectId: Types.ObjectId): string {
        return gameObjectId.toHexString();
    }

    private cacheGet(gameObjectId: Types.ObjectId): CachedGameObject<GameObjectType> | undefined {
        const cacheKey = this.idToCacheKey(gameObjectId);

        const cachedGameObject = this.cache.get(cacheKey);

        if (cachedGameObject) {
            cachedGameObject.resetTimer();
        }

        return cachedGameObject;
    }

    private cacheSet(gameObject: GameObjectType): CachedGameObject<GameObjectType> {
        const cacheKey = this.idToCacheKey(gameObject.id);
        const cacheObject = this.newCacheObject(gameObject);

        this.cache.set(cacheKey, cacheObject);

        return cacheObject;
    }

    private cacheDelete(gameObjectId: Types.ObjectId): boolean {
        const cacheKey = this.idToCacheKey(gameObjectId);

        return this.cache.delete(cacheKey);
    }

    protected async addToCache(gameObject: GameObjectType): Promise<CachedGameObject<GameObjectType>> {
        const existingCachedGameObject = this.cacheGet(gameObject.id);

        if (existingCachedGameObject) {
            return existingCachedGameObject;
        }

        try {
            await gameObject.loadFields();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error loading a cached value's information.

                Game object: ${gameObject.debugString}
                
                ${error}
            `);
        }

        const newCachedGameObject = this.cacheSet(gameObject);

        return newCachedGameObject;
    }

    public async removeFromCache(gameObjectId: Types.ObjectId): Promise<void> {
        const cachedGameObject = this.cacheGet(gameObjectId);

        if (!cachedGameObject) {
            throw new Error(stripIndent`
                Attempted to delete a value that isn't in the specified cache.

                Id: ${gameObjectId}
            `);
        }

        cachedGameObject.stopTimer();

        try {
            await cachedGameObject.gameObject.save();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error saving a game object before it was removed from the cache.

                Game object: ${cachedGameObject.gameObject.debugString}
                
                ${error}
            `);
        }

        this.cacheDelete(cachedGameObject.gameObject.id);
    }

    protected getMatchingFromCache(isMatching: (gameObject: GameObjectType) => boolean): GameObjectType | undefined {
        for (const currentCachedGameObject of this.cache.values()) {
            const currentGameObject = currentCachedGameObject.gameObject;

            if (isMatching(currentGameObject)) {
                currentCachedGameObject.resetTimer();

                return currentGameObject;
            }
        }
    }

    public async fetchById(id: Types.ObjectId): Promise<GameObjectType | undefined> {
        const cachedGameObject = this.cacheGet(id);

        if (cachedGameObject) {
            return cachedGameObject.gameObject;
        }

        let gameObjectDocument: Document | null;
        try {
            gameObjectDocument = await this.model.findById(id);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching a game object's document in a cache by its id.

                Id: ${id}
                Cache: ${JSON.stringify(this)}
                
                ${error}
            `);
        }

        if (!gameObjectDocument) {
            return;
        }

        const gameObject = this.documentToGameObject(gameObjectDocument);

        try {
            await this.addToCache(gameObject);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error adding a game object to the cache after finding it by its id.

                Game object: ${gameObject.debugString}
                Cache: ${JSON.stringify(this)}
                
                ${error}
            `);
        }

        return gameObject;
    }
}