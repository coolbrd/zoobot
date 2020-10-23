import { DMChannel, MessageEmbed, TextChannel, User } from "discord.js";
import { Document, Types } from "mongoose";
import { beastiary } from "../beastiary/Beastiary";
import SmartEmbed from "../discordUtility/SmartEmbed";
import { Species, SpeciesModel } from "../models/Species";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import PagedMessage from "./PagedMessage";

// A species id and its optionally loaded species object
interface LoadableSpecies {
    id: Types.ObjectId,
    species?: Species
}

// The message that loads and displays the list of all currently available species
export default class BeastiaryMessage extends PagedMessage<LoadableSpecies> {
    private readonly user: User;

    constructor(channel: TextChannel | DMChannel, user: User) {
        super(channel, 10);

        this.user = user;
    }

    public async build(): Promise<void> {
        // Get all species
        let speciesDocuments: Document[];
        try {
            speciesDocuments = await SpeciesModel.find({});
        }
        catch (error) {
            throw new Error(`There was an error getting a list of all species from the database: ${error}`);
        }

        // Sort species by primary common name in alphabetical order
        speciesDocuments.sort((a: Document, b: Document) => {
            return a.get("commonNamesLower")[0] > b.get("commonNamesLower")[0] ? 1 : -1;
        });

        // Add each species id as an unloaded species
        speciesDocuments.forEach(speciesDocument => {
            this.elements.push({
                id: speciesDocument._id
            });
        });

        // Build the embed initially
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

        // Fetch all the species on the current page
        try {
            await new Promise(resolve => {
                let complete = 0;
                // Iterate over every potentially unloaded species on the page
                this.visibleElements.forEach(loadableSpecies => {
                    // Fetch the species object of the current species
                    beastiary.species.fetchExistingById(loadableSpecies.id).then(species => {
                        // Assign the potentially loaded species the newly fetched species
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
        catch (error) {
            throw new Error(`There was an error bulk loading a set of species in a beastiary message: ${error}`);
        }

        // Build the page's main text
        let pageString = "";
        this.visibleElements.forEach(loadableSpecies => {
            loadableSpecies.species = loadableSpecies.species as Species;
            pageString += capitalizeFirstLetter(loadableSpecies.species.commonNames[0]) + "\n";
        });

        embed.setDescription(pageString);

        embed.setFooter(`Page ${this.page + 1}/${this.pageCount}\n${this.getButtonHelpString()}`);

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