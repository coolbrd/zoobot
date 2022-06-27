import { stripIndent } from "common-tags";
import { MessageEmbed, TextChannel } from "discord.js";
import BeastiaryClient from "../bot/BeastiaryClient";
import { bulkLoad } from "../structures/GameObject/GameObjects/LoadableGameObject/LoadableGameObject";
import LoadableCacheableGameObject from "../structures/GameObject/GameObjects/LoadableGameObject/LoadableGameObjects/LoadableCacheableGameObject";
import { Species } from "../structures/GameObject/GameObjects/Species";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import PagedListMessage from "./PagedListMessage";
import { inspect } from "util";
import { Player } from "../structures/GameObject/GameObjects/Player";

export default class TokenDisplayMessage extends PagedListMessage<LoadableCacheableGameObject<Species>> {
    public readonly fieldsPerPage = 1;
    public readonly elementsPerField = 15;

    public readonly lifetime = 30000;

    private readonly player: Player;

    constructor(channel: TextChannel, beastiaryClient: BeastiaryClient, player: Player) {
        super(channel, beastiaryClient);

        this.player = player;
        this.elements = player.getTokenLoadableSpecies();
    }

    protected formatElement(loadableSpecies: LoadableCacheableGameObject<Species>): string {
        const token = capitalizeFirstLetter(loadableSpecies.gameObject.token);

        return token;
    }

    public async buildEmbed(): Promise<MessageEmbed> {
        try {
            await bulkLoad(this.visibleElements);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error bulk loading the species within a token display message.

                Visible species: ${inspect(this.visibleElements)}
            `);
        }

        const embed = await super.buildEmbed();

        embed.setAuthor({ name: `${this.player.username}'s tokens`, iconURL: this.player.avatarURL });
        embed.setColor(0x008888);
        embed.setFooter({  text: `${this.elements.length} tokens collected` })

        return embed;
    }
}