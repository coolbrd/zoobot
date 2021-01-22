import { MessageEmbed, TextChannel, User } from "discord.js";
import buildAnimalInfo from "../embedBuilders/buildAnimalInfo";
import buildAnimalCard from "../embedBuilders/buildAnimalCard";
import PointedMessage from './PointedMessage';
import { Animal } from "../structures/GameObject/GameObjects/Animal";
import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import PointedArray from "../structures/PointedArray";

export enum AnimalDisplayMessageState {
    page,
    info,
    card
}

export default abstract class AnimalDisplayMessage extends PointedMessage<Animal> {
    protected abstract readonly numbered: boolean;

    protected state: AnimalDisplayMessageState;

    constructor(channel: TextChannel, beastiaryClient: BeastiaryClient, animals: Animal[]) {
        super(channel, beastiaryClient);

        this.state = AnimalDisplayMessageState.page;

        this.elements = new PointedArray(animals);
    }

    protected formatElement(animal: Animal): string {
        let animalString = "";

        const card = animal.card;

        let specialText = "";
        if (!animal.nickname) {
            if (card.special) {
                specialText = card.special;
            }
            else if (card.breed) {
                specialText = card.breed;
            }
            if (specialText) {
                specialText = ` (${specialText})`;
            }
        }

        const animalIndex = this.elements.indexOf(animal);

        if (this.numbered) {
            animalString += `\`${animalIndex + 1})\` `;
        }

        animalString += `${animal.showcaseDisplayName}${specialText}`;

        if (animalIndex === this.elements.pointerPosition) {
            animalString += " 🔹";
        }

        return animalString;
    }

    public async build(): Promise<void> {
        if (this.elements.length > 0) {
            this.addButton({
                emoji: "Ⓜ️",
                name: "mode",
                helpMessage: "View mode"
            });
        }
        
        try {
            await super.build();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error building an animal display message's inherited build information.

                ${error}
            `);
        }
    }

    protected async buildEmbed(): Promise<MessageEmbed> {
        let embed = new MessageEmbed();

        if (this.visibleElements.length === 0) {
            return embed;
        }

        const selectedAnimal = this.selection;

        switch (this.state) {
            case AnimalDisplayMessageState.page: {
                embed = await super.buildEmbed();

                embed.setThumbnail(selectedAnimal.card.url);
                embed.setColor(selectedAnimal.species.rarityData.color);
                break;
            }
            case AnimalDisplayMessageState.info: {
                buildAnimalInfo(embed, selectedAnimal, this.beastiaryClient.beastiary.emojis);
                break;
            }
            case AnimalDisplayMessageState.card: {
                buildAnimalCard(embed, selectedAnimal);
                break;
            }
        }
        return embed;
    }

    protected async buttonPress(buttonName: string, user: User): Promise<void> {
        switch (buttonName) {
            case "mode": {
                switch (this.state) {
                    case AnimalDisplayMessageState.page: {
                        this.state = AnimalDisplayMessageState.info;
                        break;
                    }
                    case AnimalDisplayMessageState.info: {
                        this.state = AnimalDisplayMessageState.card;
                        break;
                    }
                    case AnimalDisplayMessageState.card: {
                        this.state = AnimalDisplayMessageState.page;
                        break;
                    }
                }
                break;
            }
        }

        try {
            await super.buttonPress(buttonName, user);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error performing inherited button behavior in a collection message.
                
                ${error}
            `);
        }
    }
}