import { TextChannel } from "discord.js";

enum Mutation {
    BigEyes,
    TwoHeads
}

class Species {
    readonly commonNames: string[];
    readonly images: string[];
    readonly scientificNane: string;
    readonly family: string;
    readonly description: string;
    readonly naturalHabitat: string;
    readonly inGameRegion: string;
    readonly tags: string[];
    readonly item: string;

    constructor(commonNames: string[], images: string[], scientificName: string,
                family: string, description: string, naturalHabitat: string,
                inGameRegion: string, tags: string[], item: string) {
        this.commonNames = commonNames;
        this.images = images;
        this.scientificNane = scientificName;
        this.family = family;
        this.description = description;
        this.naturalHabitat = naturalHabitat;
        this.inGameRegion = inGameRegion;
        this.tags = tags;
        this.item = item;
    }
}

export default class Animal {
    readonly species: Species;
    readonly imageIndex: number;
    readonly mutations: Mutation[];
    readonly stats: number[];

    constructor(species: Species) {
        this.species = species;
        this.imageIndex = Math.floor(Math.random() * 10);
        this.mutations = [];
        this.stats = [Math.random(), Math.random(), Math.random()];
    }
}

class Encounter {
    readonly animal: Animal;
    readonly textChannel: TextChannel;
    fleeTimer: number;

    constructor(animal: Animal, textChannel: TextChannel, fleeTimer: number) {
        this.animal = animal;
        this.textChannel = textChannel;
        this.fleeTimer = fleeTimer;
    }
}

class CapturedAnimal {
    readonly animal: Animal;
    nickname: string | undefined = undefined;
    favorite: boolean = false;
    readonly captureDate: number;
    readonly captor: string;
    readonly homeRegion: string;

    constructor(animal: Animal, captor: string, homeRegion: string) {
        this.animal = animal;
        this.captureDate = Date.now();
        this.captor = captor;
        this.homeRegion = homeRegion;
    }
}