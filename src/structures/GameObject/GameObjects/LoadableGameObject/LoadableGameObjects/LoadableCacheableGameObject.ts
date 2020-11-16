import { Types } from 'mongoose';
import GameObject from '../../../GameObject';
import GameObjectCache from '../../../GameObjectCache';
import LoadableGameObject from "../LoadableGameObject";

export default class LoadableCacheableGameObject<GameObjectType extends GameObject> extends LoadableGameObject<GameObjectType> {
    public readonly cache: GameObjectCache<GameObjectType>;

    constructor(id: Types.ObjectId, cache: GameObjectCache<GameObjectType>) {
        super(id);

        this.cache = cache;
    }

    public async loadGameObject(): Promise<GameObjectType | undefined> {
        try {
            return await this.cache.fetchById(this.id);
        }
        catch (error) {
            throw new Error(`There was an error fetching a game object by its id in a loadable game object: ${error}`);
        }
    }
}