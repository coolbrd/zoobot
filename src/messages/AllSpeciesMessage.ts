import { User } from "discord.js";
import { Document, Types } from "mongoose";
import { beastiary } from "../beastiary/Beastiary";
import { Species, SpeciesModel } from "../models/Species";
import PagedMessage from "./PagedMessage";

interface LoadableSpecies {
    id: Types.ObjectId,
    species?: Species
}

export default abstract class AllSpeciesMessage extends PagedMessage<LoadableSpecies> {
    public async build(): Promise<void> {
        let speciesDocuments: Document[];
        try {
            speciesDocuments = await SpeciesModel.find({});
        }
        catch (error) {
            throw new Error(`There was an error getting a list of all species from the database: ${error}`);
        }

        speciesDocuments.sort((a: Document, b: Document) => {
            return a.get("commonNamesLower")[0] > b.get("commonNamesLower")[0] ? 1 : -1;
        });

        speciesDocuments.forEach(speciesDocument => {
            this.elements.push({
                id: speciesDocument._id
            });
        });
    }
    
    protected async loadSpeciesOnPage(): Promise<void> {
        return new Promise(resolve => {
            let complete = 0;
            this.visibleElements.forEach(loadableSpecies => {
                beastiary.species.fetchById(loadableSpecies.id).then(species => {
                    loadableSpecies.species = species;

                    if (++complete >= this.visibleElements.length) {
                        resolve();
                    }
                }).catch(error => {
                    throw new Error(`There was an error loading a species in a beastiary message: ${error}`);
                });
            });
        });
    }

    public async buttonPress(buttonName: string, user: User): Promise<void> {
        super.buttonPress(buttonName, user);

        switch (buttonName) {
            case "leftArrow": {
                this.movePages(-1);
                break;
            }
            case "rightArrow": {
                this.movePages(1);
                break;
            }
        }

        try {
            await this.refreshEmbed();
        }
        catch (error) {
            throw new Error(`There was an error refreshing an all species message's embed after a button press: ${error}`);
        }
    }
}