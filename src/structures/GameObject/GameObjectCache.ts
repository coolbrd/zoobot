import { stripIndent } from "common-tags";
import { Document, Model, Types } from "mongoose";
import BeastiaryClient from "../../bot/BeastiaryClient";
import CachedGameObject from "./CachedGameObject";
import GameObject from "./GameObject";
import { inspect } from "util";

export default abstract class GameObjectCache<GameObjectType extends GameObject> {
    // The model in which game object's documents will be found
    protected abstract readonly model: Model<Document>;

    protected abstract readonly cacheObjectTimeout: number;

    protected abstract documentToGameObject(document: Document): GameObjectType;

    private readonly cache = new Map<string, CachedGameObject<GameObjectType>>();
    private readonly loadingCache = new Map<string, GameObjectType>();

    protected readonly beastiaryClient: BeastiaryClient;

    constructor(beastiaryClient: BeastiaryClient) {
        this.beastiaryClient = beastiaryClient;
    }

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

    private addToLoadingCache(gameObject: GameObjectType): void {
        const idKey = this.idToCacheKey(gameObject.id);
        this.loadingCache.set(idKey, gameObject);
    }

    private removeFromLoadingCache(gameObject: GameObjectType): void {
        const idKey = this.idToCacheKey(gameObject.id);
        this.loadingCache.delete(idKey);
    }

    private getFromLoadingCache(id: Types.ObjectId): GameObjectType | undefined {
        const idKey = this.idToCacheKey(id);
        return this.loadingCache.get(idKey);
    }

    private async addToCache(gameObject: GameObjectType): Promise<CachedGameObject<GameObjectType>> {
        this.addToLoadingCache(gameObject);

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

        this.removeFromLoadingCache(gameObject);

        const newCachedGameObject = this.cacheSet(gameObject);

        return newCachedGameObject;
    }

    protected async addDocumentToCache(document: Document): Promise<GameObjectType> {
        const existingCachedGameObject = this.cacheGet(document._id);

        if (existingCachedGameObject) {
            try {
                await existingCachedGameObject.gameObject.loadFields();
            }
            catch (error) {
                throw new Error(stripIndent`
                    An existing cached game object that was found while adding a document to a cache threw an error while reloading its fields.

                    ${existingCachedGameObject}

                    ${error}
                `);
            }

            return existingCachedGameObject.gameObject;
        }

        const gameObject = this.documentToGameObject(document);

        try {
            await this.addToCache(gameObject);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error adding a newly created game object to a cache.

                Document: ${document.toString()}
                Game object: ${gameObject.debugString}

                ${error}
            `);
        }

        return gameObject;
    }

    public async removeFromCache(gameObjectId: Types.ObjectId): Promise<void> {
        const cachedGameObject = this.cacheGet(gameObjectId);

        if (!cachedGameObject) {
            return;
        }

        cachedGameObject.stopTimer();

        await cachedGameObject.gameObject.updateAllFields();

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
                Cache: ${inspect(this)}
                
                ${error}
            `);
        }

        if (!gameObjectDocument) {
            return;
        }

        let gameObject: GameObjectType;
        try {
            gameObject = await this.addDocumentToCache(gameObjectDocument);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error adding a game object to a cache by its document.

                Document: ${gameObjectDocument.toString()}

                ${id}
            `);
        }

        return gameObject;
    }

    public async fetchReferenceById(id: Types.ObjectId): Promise<GameObjectType | undefined> {
        const loadingReference = this.getFromLoadingCache(id);

        if (loadingReference) {
            return loadingReference;
        }

        try {
            return await this.fetchById(id);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching a game object reference by an id after no loading object was found.

                Id: ${id}

                ${error}
            `);
        }
    }

    public async dumpCache(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.cache.size === 0) {
                resolve();
            }

            let completed = 0;
            const originalSize = this.cache.size;

            for (const cachedGameObject of this.cache.values()) {
                this.removeFromCache(cachedGameObject.gameObject.id).then(() => {
                    if (++completed >= originalSize) {
                        resolve();
                    }
                }).catch(error => {
                    reject(stripIndent`
                        There was an error removing a game object from a cache during a cache dump operation.

                        Game object id: ${cachedGameObject.gameObject.id}

                        ${error}
                    `);
                });
            }
        });
    }
}