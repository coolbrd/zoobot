import { TextChannel } from "discord.js";
import Species from "./species";

enum Mutation {
    BigEyes,
    TwoHeads
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