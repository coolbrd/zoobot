import { stripIndent } from "common-tags";
import { Types } from "mongoose";
import GameObject from "../../GameObject";
import { inspect } from "util";

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

    public abstract loadGameObject(): Promise<GameObjectType | undefined>;
}

export async function bulkLoad(loadableGameObjects: LoadableGameObject<GameObject>[]): Promise<void> {
    const loadPromises: Promise<void>[] = [];

    loadableGameObjects.forEach(loadableGameObject => {
        const loadPromise = loadableGameObject.load();

        loadPromises.push(loadPromise);
    });
    
    try {
        await Promise.all(loadPromises);
    }
    catch (error) {
        throw new Error(stripIndent`
            There was an error loading at least one loadable game object's game object.

            ${error}
        `);
    }
}