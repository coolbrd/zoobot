import { MessageEmbed, TextChannel, User } from "discord.js";
import { Animal } from "../models/Animal";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import PagedMessage from "./PagedMessage";
import { beastiary } from "../beastiary/Beastiary";
import { Types } from "mongoose";
import SmartEmbed from "../discordUtility/SmartEmbed";
import buildAnimalInfo from "../embedBuilders/buildAnimalInfo";
import buildAnimalCard from "../embedBuilders/buildAnimalCard";

// The set of states that an animal display message can be in
export enum AnimalDisplayMessageState {
    page,
    info,
    card
}

// An animal id with its optionally loaded animal object
interface LoadableAnimal {
    id: Types.ObjectId,
    animal?: Animal
}

// The message displaying a player's animal collection
export default abstract class AnimalDisplayMessage extends PagedMessage<LoadableAnimal> {
    // The current display state of the message
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

        // Start the message in paged view mode
        this.state = AnimalDisplayMessageState.page;

        const loadableAnimals: LoadableAnimal[] = [];

        for (const animalId of animalIds) {
            loadableAnimals.push({
                id: animalId
            });
        }

        // Set paged elements
        this.setElements(loadableAnimals);
    }

    protected async buildEmbed(): Promise<MessageEmbed> {
        const embed = new SmartEmbed();

        const loadableAnimalsOnPage = this.visibleElements;

        if (loadableAnimalsOnPage.length <= 0) {
            return embed;
        }

        // Bulk load all animals on the current page
        try {
            await new Promise(resolve => {
                let count = 0;
                // Iterate over every loadable animal on the page
                loadableAnimalsOnPage.forEach(loadableAnimal => {
                    // Get each animal's object by their id
                    beastiary.animals.fetchById(loadableAnimal.id).then(animal => {
                        // Assign the loaded animal
                        loadableAnimal.animal = animal;

                        // Resolve once all animals on the page are loaded
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
                // Iterate over every animal on the current page
                loadableAnimalsOnPage.forEach(loadableAnimal => {
                    // Get the animal object
                    const currentAnimal = loadableAnimal.animal;

                    if (!currentAnimal) {
                        throw new Error("An unloaded animal that should have been loaded was found in an animal display message.");
                    }

                    const card = currentAnimal.card;

                    const animalName = currentAnimal.nickname || capitalizeFirstLetter(currentAnimal.name);

                    // Add special or breed text if applicable
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

                    // The pointer text to draw on the current animal entry (if any)
                    const pointerText = elementIndex === this.elements.pointerPosition ? " 🔹" : "";

                    pageString += `\`${elementIndex + 1})\` ${animalName}${specialText}`;

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

        // Button behavior
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
                // Change pages if the message is in page mode, otherwise move the pointer
                if (this.state === AnimalDisplayMessageState.page) {
                    this.movePages(-1);
                }
                else {
                    this.movePointer(-1);
                }
                break;
            }
            case "rightArrow": {
                // Change pages if the message is in page mode, otherwise move the pointer
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

        // Rebuild the message
        try {
            await this.refreshEmbed();
        }
        catch (error) {
            throw new Error(`There was an error rebuilding the embed of a collection message: ${error}`);
        }
    }
}