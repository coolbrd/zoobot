import { MessageEmbed, TextChannel, User } from "discord.js";
import { Animal } from "../models/Animal";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import PagedMessage from "./PagedMessage";
import { beastiary } from "../beastiary/Beastiary";
import { Types } from "mongoose";
import SmartEmbed from "../discordUtility/SmartEmbed";
import buildAnimalInfo from "../embedBuilders/buildAnimalInfo";
import buildAnimalCard from "../embedBuilders/buildAnimalCard";

export enum AnimalDisplayMessageState {
    page,
    info,
    card
}

interface LoadableAnimal {
    id: Types.ObjectId,
    animal?: Animal
}

export default abstract class AnimalDisplayMessage extends PagedMessage<LoadableAnimal> {
    protected state: AnimalDisplayMessageState;

    constructor(channel: TextChannel, animalIds: Types.ObjectId[], singlePage?: boolean, disablePointer?: boolean) {
        super(channel, singlePage);

        if (!disablePointer) {
            this.addButtons([
                {
                    name: "upArrow",
                    emoji: "⬆️",
                    helpMessage: "Pointer up"
                },
                {
                    name: "downArrow",
                    emoji: "⬇️",
                    helpMessage: "Pointer down"
                },
                {
                    name: "mode",
                    emoji: "Ⓜ️",
                    helpMessage: "View mode"
                }
            ]);
        }

        this.state = AnimalDisplayMessageState.page;

        const loadableAnimals: LoadableAnimal[] = [];

        for (const animalId of animalIds) {
            loadableAnimals.push({
                id: animalId
            });
        }

        this.setElements(loadableAnimals);
    }

    protected async buildEmbed(): Promise<MessageEmbed> {
        const embed = new SmartEmbed();

        const loadableAnimalsOnPage = this.visibleElements;

        if (loadableAnimalsOnPage.length <= 0) {
            return embed;
        }

        try {
            await new Promise(resolve => {
                let count = 0;
                loadableAnimalsOnPage.forEach(loadableAnimal => {
                    beastiary.animals.fetchById(loadableAnimal.id).then(animal => {
                        loadableAnimal.animal = animal;

                        if (++count >= loadableAnimalsOnPage.length) {
                            resolve();
                        }
                    }).catch(error => {
                        throw new Error(`There was an error fetching an animal in an collection message: ${error}`);
                    });
                });
            });
        }
        catch (error) {
            throw new Error(`There was an error bulk fetching an collection page of animals: ${error}`);
        }

        const selectedLoadableAnimal = this.elements.selection;

        if (!selectedLoadableAnimal.animal) {
            throw new Error("The selected animal within an animal display message wasn't loaded somehow.");
        }

        const selectedAnimal = selectedLoadableAnimal.animal;

        switch (this.state) {
            case AnimalDisplayMessageState.page: {
                embed.setThumbnail(selectedAnimal.card.url);

                let pageString = "";
                let elementIndex = this.firstVisibleIndex;
                loadableAnimalsOnPage.forEach(loadableAnimal => {
                    const currentAnimal = loadableAnimal.animal;

                    if (!currentAnimal) {
                        throw new Error("An unloaded animal that should have been loaded was found in an animal display message.");
                    }

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

    public async buttonPress(buttonName: string, user: User): Promise<void> {
        super.buttonPress(buttonName, user);

        switch (buttonName) {
            case "upArrow": {
                this.movePointer(-1);
                break;
            }
            case "downArrow": {
                this.movePointer(1);
                break;
            }
            case "leftArrow": {
                if (this.state === AnimalDisplayMessageState.page) {
                    this.movePages(-1);
                }
                else {
                    this.movePointer(-1);
                }
                break;
            }
            case "rightArrow": {
                if (this.state === AnimalDisplayMessageState.page) {
                    this.movePages(1);
                }
                else {
                    this.movePointer(1);
                }
                break;
            }
            case "mode": {
                if (this.state === AnimalDisplayMessageState.page) {
                    this.state = AnimalDisplayMessageState.info;
                }
                else if (this.state === AnimalDisplayMessageState.info) {
                    this.state = AnimalDisplayMessageState.card;
                }
                else {
                    this.state = AnimalDisplayMessageState.page;
                }
                break;
            }
        }

        try {
            await this.refreshEmbed();
        }
        catch (error) {
            throw new Error(`There was an error rebuilding the embed of a collection message: ${error}`);
        }
    }
}