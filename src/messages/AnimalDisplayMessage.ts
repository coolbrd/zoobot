import { MessageEmbed, TextChannel } from "discord.js";
import { beastiary } from "../beastiary/Beastiary";
import { Types } from "mongoose";
import SmartEmbed from "../discordUtility/SmartEmbed";
import buildAnimalInfo from "../embedBuilders/buildAnimalInfo";
import buildAnimalCard from "../embedBuilders/buildAnimalCard";
import PointedMessage from './PointedMessage';
import LoadableGameObject, { bulkLoad } from '../structures/LoadableGameObject';
import { Animal } from '../models/Animal';

export enum AnimalDisplayMessageState {
    page,
    info,
    card
}

export default abstract class AnimalDisplayMessage extends PointedMessage<LoadableGameObject<Animal>> {
    protected state: AnimalDisplayMessageState;

    constructor(channel: TextChannel, animalIds: Types.ObjectId[]) {
        super(channel);

        this.state = AnimalDisplayMessageState.page;

        this.buildLoadableAnimalList(animalIds);
    }

    private buildLoadableAnimalList(animalIds: Types.ObjectId[]): void {
        animalIds.forEach(currentAnimalId => {
            const loadableAnimal = new LoadableGameObject(currentAnimalId, beastiary.animals);
            this.elements.push(loadableAnimal);
        });
    }

    protected async buildEmbed(): Promise<MessageEmbed> {
        const embed = new SmartEmbed();

        const loadableAnimalsOnPage = this.visibleElements;

        if (loadableAnimalsOnPage.length === 0) {
            return embed;
        }

        try {
            await bulkLoad(loadableAnimalsOnPage);
        }
        catch (error) {
            throw new Error(`There was an error bulk loading all the animals on a page of an animal display message: ${error}`);
        }

        const selectedAnimal = this.selection.gameObject;

        switch (this.state) {
            case AnimalDisplayMessageState.page: {
                embed.setThumbnail(selectedAnimal.card.url);

                let pageString = "";
                let elementIndex = this.firstVisibleIndex;
                loadableAnimalsOnPage.forEach(loadableAnimal => {
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
                buildAnimalInfo(embed, selectedAnimal);
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