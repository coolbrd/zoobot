import { DMChannel, MessageEmbed, TextChannel, User } from "discord.js";
import { Document } from "mongoose";

import SmartEmbed from "../discordUtility/SmartEmbed";
import { SpeciesModel, Species } from "../models/Species";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import PagedMessage from "./PagedMessage";

export default class BeastiaryMessage extends PagedMessage<Species> {
    private readonly user: User;

    constructor(channel: TextChannel | DMChannel, user: User) {
        super(channel, 10);

        this.user = user;
    }

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
            const currentSpecies = new Species(speciesDocument._id);
            this.elements.push(currentSpecies);
        });

        try {
            this.setEmbed(await this.buildEmbed());
        }
        catch (error) {
            throw new Error(`There was an error building a beastiary message's initial embed: ${error}`);
        }
    }
    
    private async buildEmbed(): Promise<MessageEmbed> {
        const embed = new SmartEmbed();

        embed.setAuthor(`${this.user.username}'s Beastiary`, this.user.avatarURL() || undefined);

        const speciesOnPage = this.visibleElements;

        try {
            await new Promise(resolve => {
                let complete = 0;
                speciesOnPage.forEach(species => {
                    species.load().then(() => {
                        if (++complete >= speciesOnPage.length) {
                            resolve();
                        }
                    }).catch(error => {
                        throw new Error(`There was an error loading a species in a beastiary message: ${error}`);
                    });
                });
            });
        }
        catch (error) {
            throw new Error(`There was an error bulk loading a set of species in a beastiary message: ${error}`);
        }

        let pageString = "";
        speciesOnPage.forEach(speciesObject => {
            pageString += capitalizeFirstLetter(speciesObject.commonNames[0]) + "\n";
        });

        embed.setDescription(pageString);

        embed.setFooter(this.getButtonHelpString());

        return embed;
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
            this.setEmbed(await this.buildEmbed());
        }
        catch (error) {
            throw new Error(`There was an error building a beastiary message's embed after a button press: ${error}`);
        }
    }
}