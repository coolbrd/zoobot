import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import AnimalManager from "./AnimalManager";
import ChannelManager from "./ChannelManager";
import EmojiManager from './EmojiManager';
import EncounterManager from "./EncounterManager";
import PlayerGuildManager from "./PlayerGuildManager";
import PlayerManager from "./PlayerManager";
import ResetManager from "./ResetManager";
import ShardManager from "./ShardManager";
import ShopManager from "./ShopManager";
import SpeciesManager from "./SpeciesManager";

// The central cache holder/manager for all game object managers within The Beastiary
export default class Beastiary {
    public readonly players: PlayerManager;
    public readonly animals: AnimalManager;
    public readonly playerGuilds: PlayerGuildManager;
    public readonly species: SpeciesManager;
    public readonly encounters: EncounterManager;
    public readonly channels: ChannelManager;
    public readonly resets: ResetManager;
    public readonly emojis: EmojiManager;
    public readonly shards: ShardManager;
    public readonly shops: ShopManager;

    constructor(beastiaryClient: BeastiaryClient) {
        this.players = new PlayerManager(beastiaryClient);
        this.animals = new AnimalManager(beastiaryClient);
        this.playerGuilds = new PlayerGuildManager(beastiaryClient);
        this.species = new SpeciesManager(beastiaryClient);
        this.encounters = new EncounterManager(beastiaryClient);
        this.channels = new ChannelManager(beastiaryClient);
        this.resets = new ResetManager();
        this.emojis = new EmojiManager(beastiaryClient);
        this.shards = new ShardManager(beastiaryClient);
        this.shops = new ShopManager(beastiaryClient);
    }

    public async init(): Promise<void> {
        try {
            await this.players.init();
        }
        catch (error) {
            throw new Error(stripIndent`
                There as an error initializing a Beastiary's player manager.

                ${error}
            `);
        }
        
        try {
            await this.species.init();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error initializing a Beastiary's species manager.

                ${error}
            `);
        }

        try {
            await this.channels.init();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error initializing a Beastiary's channel manager.

                ${error}
            `);
        }

        try {
            await this.emojis.init();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error initializing a Beastiary's emoji manager.

                ${error}
            `);
        }
    }

    public async exit(): Promise<void> {
        try {
            await this.animals.dumpCache();
            console.log("Animal cache dumped.");

            await this.playerGuilds.dumpCache();
            console.log("Guild cache dumped.");

            await this.players.dumpCache();
            console.log("Player cache dumped.");

            await this.species.dumpCache();
            console.log("Species cache dumped.");
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error dumping all the caches.

                ${error}
            `);
        }
    }
}