import { stripIndent } from "common-tags";
import { Types } from "mongoose";
import { Animal } from "../../Animal";
import { Player } from "../../Player";
import LoadableGameObject from "../LoadableGameObject";
import { inspect } from "util";

export default class LoadableOwnedAnimal extends LoadableGameObject<Animal> {
    private readonly owner: Player;

    constructor(id: Types.ObjectId, owner: Player) {
        super(id);

        this.owner = owner;
    }

    public async loadGameObject(): Promise<Animal | undefined> {
        try {
            return await this.owner.fetchAnimalById(this.id);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error loading an owned animal from its owner's collection.

                Id: ${this.id}
                Owner: ${inspect(this.owner)}

                ${error}
            `);
        }
    }
}