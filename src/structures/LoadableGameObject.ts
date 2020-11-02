import { Types } from 'mongoose';
import GameObject from './GameObject';
import GameObjectCache from './GameObjectCache';

export default class LoadableGameObject<GameObjectType extends GameObject> {
    public readonly id: Types.ObjectId;
    public readonly cache: GameObjectCache<GameObjectType>;

    private _gameObject: GameObjectType | undefined;

    constructor(id: Types.ObjectId, cache: GameObjectCache<GameObjectType>) {
        this.id = id;
        this.cache = cache;
    }

    public get loaded(): boolean {
        return Boolean(this._gameObject);
    }

    public get gameObject(): GameObjectType {
        if (!this.loaded) {
            throw new Error("A loadable game object's object was attempted to be read before it was loaded.");
        }

        return this._gameObject as GameObjectType;
    }

    public async load(): Promise<void> {
        try {
            this._gameObject = await this.cache.fetchById(this.id);
        }
        catch (error) {
            throw new Error(`There was an error fetching a game object by its id in a loadable game object: ${error}`);
        }
    }
}

export async function bulkLoad(loadableGameObjects: LoadableGameObject<GameObject>[]): Promise<void> {
    return new Promise(resolve => {
        let completed = 0;
        if (loadableGameObjects.length === 0) {
            resolve();
        }
        loadableGameObjects.forEach(currentLoadableGameObject => {
            currentLoadableGameObject.load().then(() => {
                completed += 1;
                if (completed >= loadableGameObjects.length) {
                    resolve();
                }
            }).catch(error => {
                throw new Error(`There was an error loading a game object from a loadable game object: ${error}`);
            });
        });
    });
}