import { stripIndents } from "common-tags";
import { DMChannel, MessageEmbed, TextChannel, User } from "discord.js";
import awaitUserNextMessage from "../discordUtility/awaitUserNextMessage";
import handleUserError from "../discordUtility/handleUserError";
import { betterSend, safeDeleteMessage } from "../discordUtility/messageMan";
import SmartEmbed from "../discordUtility/SmartEmbed";
import InteractiveMessage from "../interactiveMessage/InteractiveMessage";
import { EDoc, EDocField, EDocValue, SimpleEDoc } from "../structures/eDoc/EDoc";
import { EDocFieldInfo } from '../structures/eDoc/EDocSkeleton';
import PointedArray from "../structures/PointedArray";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

export default class EDocMessage extends InteractiveMessage {
    protected readonly lifetime = 300000;

    private readonly selectionStack: EDocField<EDocValue>[] = [];

    // Exists so multiple input prompts can't exist at once
    private takingInput = false;

    constructor(channel: TextChannel | DMChannel, eDoc: EDoc, docName?: string) {
        super(channel);

        this.addButtons([
            {
                name: "pointerUp",
                emoji: "⬆️",
                helpMessage: "Pointer up"
            },
            {
                name: "pointerDown",
                emoji: "⬇️",
                helpMessage: "Pointer down"
            },
            {
                name: "edit",
                emoji: "✏️",
                helpMessage: "Edit"
            },
            {
                name: "back",
                emoji: "⬅️",
                helpMessage: "Back"
            },
            {
                name: "new",
                emoji: "🆕",
                helpMessage: "New item"
            },
            {
                name: "delete",
                emoji: "🗑️",
                helpMessage: "Delete item"
            },
            {
                name: "submit",
                emoji: "✅",
                helpMessage: "Submit"
            },
            {
                name: "exit",
                emoji: "❌",
                helpMessage: "Exit"
            }
        ]);

        // This is done in here so declarations of top-level eDocs don't need to explicitly declare their type, as it's implicit
        const topFieldInfo: EDocFieldInfo = {
            type: eDoc.getSkeleton(),
            alias: docName || "top document",
            required: true
        };

        const topField = new EDocField(topFieldInfo);
        topField.setValue(eDoc);

        // Add the newly created eDoc field to the front of the selection stack, meaning it's selected
        this.selectionStack.push(topField);
    }

    private getSelection(): EDocField<EDocValue> {
        return this.selectionStack[this.selectionStack.length - 1];
    }

    protected async buildEmbed(): Promise<MessageEmbed> {
        const selectedField = this.getSelection();

        // The value of the currently selected field (an eDoc or an array)
        const selectedFieldValue = selectedField.getValue();

        // If the field's value isn't a supported selected type
        if (!(selectedFieldValue instanceof EDoc) && !(selectedFieldValue instanceof PointedArray)) {
            throw new Error(stripIndents`
                Unexpected value type selected in eDoc.

                Selected field value: ${JSON.stringify(selectedFieldValue)}
            `);
        }

        const embed = new SmartEmbed();

        let fieldTitle = "";

        fieldTitle += selectedField.getAlias();

        if (!fieldTitle) {
            if (selectedField.getTypeString() === "edoc") {
                fieldTitle = "anonymous document";
            }
            else {
                fieldTitle = "anonymous list";
            }
        }

        fieldTitle = capitalizeFirstLetter(fieldTitle);

        if (selectedField.getTypeString() === "edoc") {
            fieldTitle = `__${fieldTitle}__`;
        }

        if (!selectedField.requirementsMet()) {
            fieldTitle += " (incomplete)"
        }

        embed.setTitle(`Now editing: ${fieldTitle}`);

        // eDoc behavior
        if (selectedFieldValue instanceof EDoc) {
            // Hide array buttons
            this.disableButton("new");
            this.setButtonHelpMessage("delete", "Clear field");

            for (const [fieldName, field] of selectedFieldValue.getFields()) {
                if (field.getHidden()) {
                    continue;
                }

                let fieldLabel = "";
                if (!field.requirementsMet()) {
                    fieldLabel += "✗ "
                }

                fieldLabel += capitalizeFirstLetter(field.getAlias() || "anonymous field") + ": ";

                if (fieldName === selectedFieldValue.getSelectedFieldName()) {
                    fieldLabel += "✏️";
                }

                const valueString = field.toString();

                embed.addField(fieldLabel, valueString);
            }
        }
        // Array behavior
        else {
            // Show array buttons
            this.enableButton("new");
            this.setButtonHelpMessage("delete", "Delete entry");

            const arrayString = selectedField.toString({ arrayPointer: "✏️" });

            embed.setDescription(arrayString);
        }

        const topLevelIsSelected = this.selectionStack.length === 1;
        const allRequirementsMet = this.selectionStack[0].requirementsMet();

        if (topLevelIsSelected && allRequirementsMet) {
            this.enableButton("submit");
        }
        else {
            this.disableButton("submit");
        }

        if (!topLevelIsSelected) {
            this.enableButton("back");
        }
        else {
            this.disableButton("back");
        }

        embed.setFooter(this.getButtonHelpString());

        return embed;
    }

    public async buttonPress(buttonName: string, user: User): Promise<void> {
        try {
            await super.buttonPress(buttonName, user);
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error performing inherited button press information in an eDoc message.
                
                ${error}
            `);
        }

        const selectedField = this.getSelection();
        const selectedFieldValue = selectedField.getValue();

        // Make sure the selected field's value is either a document or an array
        if (!(selectedFieldValue instanceof EDoc) && !(selectedFieldValue instanceof PointedArray)) {
            throw new Error(stripIndents`
                Unexpected value type selected in eDoc.

                Selected field value: ${JSON.stringify(selectedFieldValue)}
            `);
        }

        if (this.takingInput) {
            betterSend(this.channel, "Finish your current input prompt first.", 10000);
            return;
        }

        // Document controls
        if (selectedFieldValue instanceof EDoc) {
            // Get the field that the pointer is currently selecting
            const selectedNestedField = selectedFieldValue.getSelectedField();

            const fieldType = selectedNestedField.getTypeString();

            switch (buttonName) {
                case "pointerUp": {
                    selectedFieldValue.decrementPointer();
                    break;
                }
                case "pointerDown": {
                    selectedFieldValue.incrementPointer();
                    break;
                }
                case "edit": {
                    switch (fieldType) {
                        case "string": 
                        case "number": {
                            let promptString: string;
                            if (fieldType === "string") {
                                promptString = selectedNestedField.getPrompt() || "Enter your input for this field:";
                            }
                            else {
                                promptString = selectedNestedField.getPrompt() || "Enter your numeric input for this field:"
                            }

                            let userInput: string | undefined;
                            try {
                                userInput = await this.takeUserInput(promptString, user);
                            }
                            catch (error) {
                                throw new Error(stripIndents`
                                    There was an error taking a user's input in an eDoc message.

                                    Selected nested field: ${JSON.stringify(selectedNestedField)}
                                    
                                    ${error}
                                `);
                            }

                            if (!userInput) {
                                betterSend(this.channel, "Input canceled.", 10000);
                                return;
                            }

                            try {
                                selectedNestedField.setValue(userInput);
                            }
                            catch (error) {
                                handleUserError(this.channel, error, 10000);
                            }
                            break;
                        }
                        case "array": {
                            this.selectionStack.push(selectedNestedField);
                            break;
                        }
                        case "edoc": {
                            this.selectionStack.push(selectedNestedField);
                            break;
                        }
                    }
                    break;
                }
                case "delete": {
                    if (selectedNestedField.getTypeString() !== "edoc") {
                        selectedNestedField.clearValue();
                    }
                    break;
                }
            }
        }
        // Array controls
        else {
            switch (buttonName) {
                case "pointerUp": {
                    selectedFieldValue.decrementPointer();
                    break;
                }
                case "pointerDown": {
                    selectedFieldValue.incrementPointer();
                    break;
                }
                // Edit a single item within an array
                case "edit": {
                    const selectedElement = selectedFieldValue.selection;

                    if (!selectedElement) {
                        break;
                    }

                    switch (selectedElement.getTypeString()) {
                        case "string":
                        case "number": {
                            const promptString = selectedField.getPrompt() || "Enter your input to replace this list entry:";

                            let userInput: string | undefined;
                            try {
                                userInput = await this.takeUserInput(promptString, user);
                            }
                            catch (error) {
                                throw new Error(stripIndents`
                                    There was an error taking a user's input in an eDoc message.

                                    Selected element: ${JSON.stringify(selectedElement)}
                                    
                                    ${error}
                                `);
                            }

                            if (!userInput) {
                                betterSend(this.channel, "Input canceled.", 10);
                                return;
                            }

                            try {
                                selectedElement.setValue(userInput);
                            }
                            catch (error) {
                                handleUserError(this.channel, error, 10000);
                            }
                            break;
                        }
                        // For array and document arrays, select the selected element as the new field to display
                        case "array":
                        case "edoc": {
                            this.selectionStack.push(selectedElement);
                            break;
                        }
                    }
                    break;
                }
                case "new": {
                    switch (selectedField.getNestedTypeString()) {
                        case "string":
                        case "number": {
                            const promptString = selectedField.getPrompt() || "Enter your input for a new list entry:";

                            let userInput: string | undefined;
                            try {
                                userInput = await this.takeUserInput(promptString, user);
                            }
                            catch (error) {
                                throw new Error(stripIndents`
                                    There was an error taking a user's input in an eDoc message.

                                    Selected field: ${JSON.stringify(selectedField)}
                                    
                                    ${error}
                                `);
                            }

                            if (!userInput) {
                                betterSend(this.channel, "Input canceled.", 10);
                                return;
                            }

                            try {
                                selectedField.push(userInput);
                            }
                            catch (error) {
                                handleUserError(this.channel, error, 10000);
                            }
                            break;
                        }
                        case "array":
                        case "edoc": {
                            selectedField.push();
                            break;
                        }
                    }
                    break;
                }
                case "delete": {
                    selectedFieldValue.deleteAtPointer();
                    break;
                }
            }
        }

        switch (buttonName) {
            case "back": {
                if (this.selectionStack.length > 1) {
                    this.selectionStack.pop();
                }
                break;
            }
            case "submit": {
                if (this.selectionStack.length === 1) {
                    this.emit("submit", this.selectionStack[0].getSimpleValue() as SimpleEDoc);
                    this.deactivate();
                }
                break;
            }
            case "exit": {
                this.emit("exit");
                this.deactivate();
                break;
            }
        }
    }

    private async takeUserInput(prompt: string, user: User): Promise<string | undefined> {
        this.takingInput = true;
        const promptMessage = await betterSend(this.channel, prompt);
        const responseMessage = await awaitUserNextMessage(this.channel, user, 60000);

        let input: string | undefined;
        if (responseMessage) {
            input = responseMessage.content;

            safeDeleteMessage(responseMessage);
        }

        safeDeleteMessage(promptMessage);
        this.takingInput = false;
        return input;
    }
}