import { Types } from 'mongoose';
import BeastiaryClient from "../../../bot/BeastiaryClient";
import { SpeciesModel } from '../../../models/Species';
import { CommonName, CommonNameTemplate, Species, SpeciesCard, SpeciesCardTemplate } from "./Species";

export default class UnknownSpecies extends Species {
    constructor(beastiaryClient: BeastiaryClient) {
        const fakeDocument = new SpeciesModel();

        super(fakeDocument, beastiaryClient);
    }

    public get commonNameObjects(): CommonName[] {
        return [{
            _id: new Types.ObjectId(),
            name: "Unknown species",
            article: "an"
        }];
    }

    public setCommonNameObjects(_commonNameObjects: CommonNameTemplate[]): void {
        return;
    }

    public get commonNamesLower(): string[] {
        return ["unknown species"];
    }

    public get scientificName(): string {
        return "N/A";
    }

    public set scientificName(_scientificName: string) {
        return;
    }

    public get cards(): SpeciesCard[] {
        return [unknownCard];
    }

    public setCards(_cards: SpeciesCardTemplate[]): void {
        return;
    }

    public get description(): string {
        return "Information for this species couldn't be found. Please report this to the developer if you're seeing this.";
    }

    public set description(_description: string) {
        return;
    }

    public get naturalHabitat(): string {
        return "N/A";
    }

    public set naturalHabitat(_naturalHabitat: string) {
        return;
    }

    public get wikiPage(): string {
        return "N/A";
    }

    public set wikiPage(_wikiPage: string) {
        return;
    }

    public get rarity(): number {
        return -1;
    }

    public set rarity(_rarity: number) {
        return;
    }

    public get baseValue(): number {
        return 0;
    }

    public get commonNames(): string[] {
        return ["unknown species"];
    }
}

export const unknownCard: SpeciesCard = {
    _id: new Types.ObjectId(),
    url: "",
    rarity: -1
};