import { DMChannel, MessageEmbed, TextChannel, User } from "discord.js";
import awaitUserNextMessage from "../discordUtility/awaitUserNextMessage";
import handleUserError from "../discordUtility/handleUserError";
import { betterSend, safeDeleteMessage } from "../discordUtility/messageMan";
import SmartEmbed from "../discordUtility/SmartEmbed";
import InteractiveMessage from "../interactiveMessage/InteractiveMessage";
import { EDoc, EDocField, EDocValue, SimpleEDoc } from "../structures/EDoc";
import { EDocFieldInfo } from "../structures/EDocSkeleton";
import PointedArray from "../structures/PointedArray";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

// An interactive message containing an editable document that allows for the editing of said document
export default class EDocMessage extends InteractiveMessage {
    // The stack of selected nested fields
    private readonly selectionStack: EDocField<EDocValue>[] = [];

    constructor(channel: TextChannel | DMChannel, eDoc: EDoc, docName?: string) {
        super(channel, { lifetime: 300000, buttons: [
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
        ]});

        // Create an eDoc field based on the eDoc skeleton provided
        // This is done in here so declarations of top-level eDocs don't need to explicitly declare their type, as it's implicit
        const topFieldInfo: EDocFieldInfo = {
            type: eDoc.getSkeleton(),
            alias: docName || "top document",
            required: true
        }

        const topField = new EDocField(topFieldInfo);
        topField.setValue(eDoc);

        // Add the newly created eDoc field to the front of the selection stack, meaning it's selected
        this.selectionStack.push(topField);

        this.setEmbed(this.buildEmbed());
    }

    // Gets this message's currently selected field
    private getSelection(): EDocField<EDocValue> {
        return this.selectionStack[this.selectionStack.length - 1];
    }

    private buildEmbed(): MessageEmbed {
        // The current eDoc field that's being displayed by the message
        const selectedField = this.getSelection();

        // The value of the currently selected field (an eDoc or an array)
        const selectedFieldValue = selectedField.getValue();

        // If the field's value isn't a supported selected type
        if (!(selectedFieldValue instanceof EDoc) && !(selectedFieldValue instanceof PointedArray)) {
            throw new Error("Unexpected value type selected in eDoc.");
        }

        const embed = new SmartEmbed();

        // The label for the currently selected field
        let fieldTitle = "";

        // Add the field's name
        fieldTitle += selectedField.getAlias();
        // If the current field doesn't have a name
        if (!fieldTitle) {
            // Assign an appropriate anonymous placeholder name
            if (selectedField.getTypeString() === "edoc") {
                fieldTitle = "anonymous document";
            }
            else {
                fieldTitle = "anonymous list";
            }
        }

        fieldTitle = capitalizeFirstLetter(fieldTitle);

        // Underline document field names
        if (selectedField.getTypeString() === "edoc") {
            fieldTitle = `__${fieldTitle}__`;
        }

        // Indicate whether or not this field is satisfied
        if (!selectedField.requirementsMet()) {
            fieldTitle += " (incomplete)"
        }

        embed.setTitle(`Now editing: ${fieldTitle}`);

        // EDoc behavior
        if (selectedFieldValue instanceof EDoc) {
            // Hide array buttons
            this.disableButton("new");

            this.setButtonHelpMessage("delete", "Clear field");

            // Iterate over every field in the eDoc
            for (const [fieldName, field] of selectedFieldValue.getFields()) {
                if (field.getHidden()) {
                    continue;
                }

                // The string that will represent the current field
                let fieldLabel = "";

                // Indicate if a field's requirements aren't met
                if (!field.requirementsMet()) {
                    fieldLabel += "✗ "
                }

                // Add field name
                fieldLabel += capitalizeFirstLetter(field.getAlias() || "anonymous field") + ": ";

                // Draw the edit icon if the current field is the selected field
                if (fieldName === selectedFieldValue.getSelectedFieldName()) {
                    fieldLabel += "✏️";
                }

                // Get the current field's string representation
                const valueString = field.toString();

                // Add a new field to the embed corresponding to the current field
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

        // If the top level is selected and the top document's requirements are met
        if (this.selectionStack.length === 1 && this.selectionStack[0].requirementsMet()) {
            // Allow the document to be submitted
            this.enableButton("submit");
        }
        // Otherwise, hide and disable the submit button
        else {
            this.disableButton("submit");
        }

        // If anything but the top document is selected
        if (this.selectionStack.length > 1) {
            // Show the back button
            this.enableButton("back");
        }
        // Otherwise, hide it
        else {
            this.disableButton("back");
        }

        embed.setFooter(this.getButtonHelpString());

        return embed;
    }

    public async buttonPress(buttonName: string, user: User): Promise<void> {
        super.buttonPress(buttonName, user);

        // Get the current field that's being displayed
        const selectedField = this.getSelection();

        // Get the value of the currently displayed selection
        const selectedFieldValue = selectedField.getValue();

        // Make sure the selected field's value is either a document or an array
        if (!(selectedFieldValue instanceof EDoc) && !(selectedFieldValue instanceof PointedArray)) {
            throw new Error("Unexpected value type selected in eDoc.");
        }

        // Document controls
        if (selectedFieldValue instanceof EDoc) {
            // Get the field that the pointer is currently selecting
            const selectedNestedField = selectedFieldValue.getSelectedField();

            // Button behavior depends on the field's contained information
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
                    // Edit button field type behavior
                    switch (fieldType) {
                        // Get simple string or number input
                        case "string": 
                        case "number": {
                            let promptString: string;
                            if (fieldType === "string") {
                                promptString = selectedNestedField.getPrompt() || "Enter your input for this field:";
                            }
                            else {
                                promptString = selectedNestedField.getPrompt() || "Enter your numeric input for this field:"
                            }

                            // Send the input prompt and wait for the user's response
                            const promptMessage = await betterSend(this.channel, promptString);
                            const responseMessage = await awaitUserNextMessage(this.channel, user, 60000);

                            // If the user responds
                            if (responseMessage) {
                                // Set the value of the field to the user's response value
                                try {
                                    selectedNestedField.setValue(responseMessage.content);
                                }
                                catch (error) {
                                    if (handleUserError(responseMessage.channel, error)) {
                                        throw new Error(`There was a non-user error setting a simple value in an eDoc message: ${error}`);
                                    }
                                }

                                // Delete the user's message
                                safeDeleteMessage(responseMessage);
                            }

                            // Delete the prompt message
                            safeDeleteMessage(promptMessage);
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
                    // Allow all fields other than nested documents to be cleared
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

                    // Don't do anything if the array is empty
                    if (!selectedElement) {
                        break;
                    }

                    // Edit behavior depends on the type of array
                    switch (selectedElement.getTypeString()) {
                        // For simple types, ask the user for input to replace the selected element
                        case "string":
                        case "number": {
                            const promptString = selectedField.getPrompt() || "Enter your input to replace this list entry:";

                            const promptMessage = await betterSend(this.channel, promptString);
                            const responseMessage = await awaitUserNextMessage(this.channel, user, 60000);

                            if (responseMessage) {
                                try {
                                    selectedElement.setValue(responseMessage.content);
                                }
                                catch (error) {
                                    if (handleUserError(responseMessage.channel, error)) {
                                        throw new Error(`There was a non-user error setting an eDoc array element in an eDoc message: ${error}`);
                                    }
                                }

                                safeDeleteMessage(responseMessage);
                            }

                            safeDeleteMessage(promptMessage);
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
                // New array element behavior
                case "new": {
                    // Behavior depends on the type of element contained within the array
                    switch (selectedField.getNestedTypeString()) {
                        // For strings and numbers, get user input and push it
                        case "string":
                        case "number": {
                            const promptString = selectedField.getPrompt() || "Enter your input for a new list entry:";

                            const promptMessage = await betterSend(this.channel, promptString);
                            const responseMessage = await awaitUserNextMessage(this.channel, user, 60000);

                            if (responseMessage) {
                                try {
                                    selectedField.push(responseMessage.content);
                                }
                                catch (error) {
                                    if (handleUserError(responseMessage.channel, error)) {
                                        throw new Error(`There was an error pushing a new element to an eDoc array field in an eDoc message: ${error}`);
                                    }
                                }

                                safeDeleteMessage(responseMessage);
                            }

                            safeDeleteMessage(promptMessage);
                            break;
                        }
                        // For arrays and eDocs, just add a new one to the array
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

        // Universal button behavior
        switch (buttonName) {
            case "back": {
                // Only go back if there's something to go back to
                if (this.selectionStack.length > 1) {
                    this.selectionStack.pop();
                }
                break;
            }
            case "submit": {
                // Only submit if the top level is selected
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

        this.setEmbed(this.buildEmbed());
    }
}