import { MessageEmbed, TextChannel } from "discord.js";
import SmartEmbed from "../discordUtility/SmartEmbed";
import buildAnimalInfo from "../embedBuilders/buildAnimalInfo";
import buildAnimalCard from "../embedBuilders/buildAnimalCard";
import PointedMessage from './PointedMessage';
import LoadableGameObject, { bulkLoad } from "../structures/GameObject/GameObjects/LoadableGameObject/LoadableGameObject";
import { Animal } from "../structures/GameObject/GameObjects/Animal";
import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";

export enum AnimalDisplayMessageState {
    page,
    info,
    card
}

export default abstract class AnimalDisplayMessage extends PointedMessage<LoadableGameObject<Animal>> {
    protected state: AnimalDisplayMessageState;

    constructor(channel: TextChannel, beastiaryClient: BeastiaryClient, loadableAnimals: LoadableGameObject<Animal>[]) {
        super(channel, beastiaryClient);

        this.state = AnimalDisplayMessageState.page;

        this.elements.push(...loadableAnimals);
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
        const embed = new SmartEmbed();

        while (this.allVisibleAnimalsLoaded === false) {
            try {
                await bulkLoad(this.visibleElements);
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error bulk loading all the animals on a page of an animal display message.

                    Animals on page: ${JSON.stringify(this.visibleElements)}
                    
                    ${error}
                `);
            }

            this.pruneVisibleAnimalsThatFailedToLoad();
        }

        if (this.visibleElements.length === 0) {
            return embed;
        }

        const selectedAnimal = this.selection.gameObject;

        switch (this.state) {
            case AnimalDisplayMessageState.page: {
                embed.setThumbnail(selectedAnimal.card.url);

                embed.setColor(selectedAnimal.species.rarityData.color);

                let pageString = "";
                let elementIndex = this.firstVisibleIndex;
                this.visibleElements.forEach(loadableAnimal => {
                    const currentAnimal = loadableAnimal.gameObject;

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

                    const pointerText = elementIndex === this.elements.pointerPosition ? " 🔹" : "";

                    pageString += `\`${elementIndex + 1})\` ${currentAnimal.displayName}${specialText}`;

                    pageString += ` ${pointerText}\n`;

                    elementIndex++;
                });

                embed.setDescription(pageString);
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
}