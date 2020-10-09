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
            throw new Error("There was an error getting a list of all species from the database.");
        }

        speciesDocuments.sort((a: Document, b: Document) => {
            return a.get("commonNamesLower")[0] > b.get("commonNamesLower")[0] ? 1 : -1;
        });

        speciesDocuments.forEach(speciesDocument => {
            const currentSpecies = new Species(speciesDocument._id);
            this.getElements().push(currentSpecies);
        });

        this.setEmbed(await this.buildEmbed());
    }
    
    private async buildEmbed(): Promise<MessageEmbed> {
        const embed = new SmartEmbed();

        embed.setAuthor(`${this.user.username}'s Beastiary`, this.user.avatarURL() || undefined);

        const speciesOnPage = this.getVisibleElements();

        await new Promise(resolve => {
            let complete = 0;
            speciesOnPage.forEach(species => {
                species.load().then(() => {
                    if (++complete >= speciesOnPage.length) {
                        resolve();
                    }
                });
            });
        });

        let pageString = "";
        speciesOnPage.forEach(speciesObject => {
            pageString += capitalizeFirstLetter(speciesObject.getCommonNames()[0]) + "\n";
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

        this.setEmbed(await this.buildEmbed());
    }
}