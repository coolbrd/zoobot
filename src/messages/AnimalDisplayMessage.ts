import { MessageEmbed, TextChannel, User } from "discord.js";
import buildAnimalInfo from "../embedBuilders/buildAnimalInfo";
import buildAnimalCard from "../embedBuilders/buildAnimalCard";
import PointedMessage from './PointedMessage';
import LoadableGameObject, { bulkLoad } from "../structures/GameObject/GameObjects/LoadableGameObject/LoadableGameObject";
import { Animal } from "../structures/GameObject/GameObjects/Animal";
import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import PointedArray from "../structures/PointedArray";
import { inspect } from "util";

export enum AnimalDisplayMessageState {
    page,
    info,
    card
}

export default abstract class AnimalDisplayMessage extends PointedMessage<LoadableGameObject<Animal>> {
    protected abstract readonly numbered: boolean;

    protected state: AnimalDisplayMessageState;

    constructor(channel: TextChannel, beastiaryClient: BeastiaryClient, loadableAnimals: LoadableGameObject<Animal>[]) {
        super(channel, beastiaryClient);

        this.state = AnimalDisplayMessageState.page;

        this.elements = new PointedArray(loadableAnimals);
    }

    protected formatElement(loadedAnimal: LoadableGameObject<Animal>): string {
        let animalString = "";
        
        const currentAnimal = loadedAnimal.gameObject;
        const card = currentAnimal.card;

        let specialText = "";
        if (!currentAnimal.nickname) {
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

        const animalIndex = this.elements.indexOf(loadedAnimal);

        if (this.numbered) {
            animalString += `\`${animalIndex + 1})\` `;
        }

        animalString += `${currentAnimal.showcaseDisplayName}${specialText}`;

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

    private get allVisibleAnimalsLoaded(): boolean {
        return this.visibleElements.every(animal => animal.loaded );
    }

    private pruneVisibleAnimalsThatFailedToLoad(): void {
        this.visibleElements.forEach(animal => {
            if (animal.loadFailed) {
                const unloadableAnimalIndex = this.elements.indexOf(animal);

                this.elements.splice(unloadableAnimalIndex, 1);
            }
        });
    }

    protected async buildEmbed(): Promise<MessageEmbed> {
        while (this.allVisibleAnimalsLoaded === false) {
            try {
                await bulkLoad(this.visibleElements);
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error bulk loading all the animals on a page of an animal display message.

                    Animals on page: ${inspect(this.visibleElements)}
                    
                    ${error}
                `);
            }

            this.pruneVisibleAnimalsThatFailedToLoad();
        }

        let embed = new MessageEmbed();

        if (this.visibleElements.length === 0) {
            return embed;
        }

        const selectedAnimal = this.selection.gameObject;

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