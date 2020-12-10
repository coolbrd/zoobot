import { stripIndent } from "common-tags";
import { Types } from "mongoose";
import GameObject from "../../GameObject";

export default abstract class LoadableGameObject<GameObjectType extends GameObject> {
    public readonly id: Types.ObjectId;

    private _gameObject: GameObjectType | undefined;

    private loadAttempted = false;

    constructor(id: Types.ObjectId) {
        this.id = id;
    }

    public get loaded(): boolean {
        return Boolean(this._gameObject);
    }

    public get gameObject(): GameObjectType {
        if (!this._gameObject) {
            throw new Error("A loadable game object's object was attempted to be read before it was loaded.");
        }

        return this._gameObject;
    }

    public get loadFailed(): boolean {
        return this.loadAttempted && !this.loaded;
    }

    public async load(): Promise<void> {
        try {
            this._gameObject = await this.loadGameObject();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error loading a loadable game object's game object.

                Id: ${this.id}

                ${error}
            `);
        }

        this.loadAttempted = true;
    }

    public abstract async loadGameObject(): Promise<GameObjectType | undefined>;
}

export function bulkLoad(loadableGameObjects: LoadableGameObject<GameObject>[]): Promise<void> {
    return new Promise((resolve, reject) => {
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
                reject(stripIndent`
                    There was an error loading a game object from a loadable game object.

                    LoadableGameObject: ${JSON.stringify(currentLoadableGameObject)}

                    ${error}
                `);
            });
        });
    });
}