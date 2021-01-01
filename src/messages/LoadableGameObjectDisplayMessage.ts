import { DMChannel, MessageEmbed, TextChannel } from "discord.js";
import LoadableGameObject, { bulkLoad } from "../structures/GameObject/GameObjects/LoadableGameObject/LoadableGameObject";
import PagedListMessage from './PagedListMessage';
import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import GameObject from "../structures/GameObject/GameObject";

export default abstract class LoadableGameObjectDisplayMessage<GameObjectType extends GameObject> extends PagedListMessage<LoadableGameObject<GameObjectType>> {
    constructor(channel: TextChannel | DMChannel, beastiaryClient: BeastiaryClient, loadableGameObjects: LoadableGameObject<GameObjectType>[]) {
        super(channel, beastiaryClient);

        this.elements = loadableGameObjects;
    }
    
    protected async buildEmbed(): Promise<MessageEmbed> {
        try {
            await bulkLoad(this.visibleElements);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error loading the visible elements of a loadable game object message.
                
                ${error}
            `);
        }

        return await super.buildEmbed();
    }
}