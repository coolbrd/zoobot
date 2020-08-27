import { MessageEmbed, TextChannel, User, Message, DMChannel } from 'discord.js';

import { InteractiveMessage } from './interactiveMessage';
import EditableDocument, { EditableDocumentField } from '../utility/editableDocument';
import { capitalizeFirstLetter, betterSend, awaitUserNextMessage, safeDeleteMessage } from '../utility/toolbox';
import { PointedArray } from '../utility/pointedArray';

export default class EditableDocumentMessage extends InteractiveMessage {
    private readonly document: EditableDocument;

    private selection: EditableDocumentField[] = [];

    constructor(channel: TextChannel | DMChannel, document: EditableDocument) {
        super(channel, { buttons: [
            {
                name: 'pointerUp',
                emoji: '⬆️',
                helpMessage: 'Pointer up'
            },
            {
                name: 'pointerDown',
                emoji: '⬇️',
                helpMessage: 'Pointer down'
            },
            {
                name: 'edit',
                emoji: '✏️',
                helpMessage: 'Edit selection'
            },
            {
                name: 'back',
                emoji: '⬅️',
                helpMessage: 'Back'
            },
            {
                name: 'delete',
                emoji: '🗑️',
                helpMessage: 'Delete entry'
            },
            {
                name: 'new',
                emoji: '🆕',
                helpMessage: 'New entry'
            },
            {
                name: 'submit',
                emoji: '✅',
                helpMessage: 'Approve'
            }
        ], lifetime: 300000 });

        this.document = document;
        this.selection.push({
            fieldInfo: {
                alias: 'Submission',
                type: 'document'
            },
            value: this.document
        });

        // Initialize the message's embed
        this.setEmbed(this.buildEmbed());
    }

    private getSelection(): EditableDocumentField {
        return this.selection[this.selection.length - 1];
    }

    private setSelection(selection: EditableDocumentField): void {
        this.selection.push(selection);
    }

    private backOneLevel(): void {
        if (this.selection.length > 1) {
            this.selection.pop();
        }
    }

    private buildEmbed(): MessageEmbed {
        const newEmbed = new MessageEmbed();

        const selection = this.getSelection();
        newEmbed.setTitle(`Now editing: ${selection.fieldInfo.alias}`);

        if (selection.value instanceof EditableDocument) {
            const document = selection.value;

            for (const [key, field] of document.fields.entries()) {
                let selected = false;
                if (key === document.fieldNames.selection()) {
                    selected = true;
                }
                newEmbed.addField(`${capitalizeFirstLetter(field.fieldInfo.alias)}${selected ? ' * ' : ''}`, field.value.toString() || '*Empty*');
            }
        }
        else if (selection.value instanceof PointedArray) {
            selection.fieldInfo.prompt && newEmbed.setFooter(selection.fieldInfo.prompt);
            let content = '';
            let arrayIndex = 0;
            for (const value of selection.value.getArray()) {
                const selected = selection.value.getPointerPosition() === arrayIndex;
                content += `${value.toString()} ${selected ? ' * ' : ''}\n`;
                arrayIndex++;
            }

            if (!content) {
                content = '*Empty*';
            }

            newEmbed.setDescription(content);
        }
        else {
            throw new Error('Unexpected type of data selected by an EditableDocumentMessage');
        }

        return newEmbed;
    }

    public async buttonPress(buttonName: string, user: User): Promise<void> {
        // Make sure the timer is reset whenever a button is pressed
        super.buttonPress(buttonName, user);

        const selection = this.getSelection();

        switch (buttonName) {
            case 'pointerUp': {
                if (selection.value instanceof EditableDocument) {
                    selection.value.fieldNames.decrementPointer();
                }
                else if (selection.value instanceof PointedArray) {
                    selection.value.decrementPointer();
                }
                break;
            }
            case 'pointerDown': {
                if (selection.value instanceof EditableDocument) {
                    selection.value.fieldNames.incrementPointer();
                }
                else if (selection.value instanceof PointedArray) {
                    selection.value.incrementPointer();
                }
                break;
            }
            case 'edit': {
                if (selection.value instanceof EditableDocument) {
                    const selectedField = selection.value.getSelection();
                    if (selectedField.value instanceof EditableDocument || selectedField.value instanceof PointedArray) {
                        this.setSelection(selectedField);
                    }
                    else if (typeof selectedField.value === 'string') {
                        const promptString = selectedField.fieldInfo.prompt || 'Enter the information that you would like to insert into this field.'
                        const promptMessage = await betterSend(this.channel, promptString);

                        const responseMessage = await awaitUserNextMessage(this.channel, user, 60000);

                        if (responseMessage) {
                            selectedField.value = responseMessage.content;

                            safeDeleteMessage(responseMessage);
                        }

                        safeDeleteMessage(promptMessage);
                    }
                    else if (typeof selectedField.value === 'boolean') {
                        selectedField.value = !selectedField.value;
                    }
                    else {
                        throw new Error('Unexpected type in EditableDocument');
                    }
                }
                else if (selection.value instanceof PointedArray) {
                    const selectedElement = selection.value.selection();
                    if (selectedElement instanceof EditableDocument) {
                        this.setSelection({
                            fieldInfo: {
                                alias: 'Document',
                                type: 'document'
                            },
                            value: selectedElement
                        });
                    }
                }
                break;
            }
            case 'back': {
                this.backOneLevel();
                break;
            }
            case 'new': {
                if (selection.value instanceof PointedArray) {
                    if (!selection.fieldInfo.arrayType) {
                        throw new Error('Found no type for a PointedArray when one was expected');
                    }

                    if (selection.fieldInfo.arrayType === 'string') {
                        const promptString = selection.fieldInfo.prompt || 'Enter your input for this new entry.';
                        const promptMessage = await betterSend(this.channel, promptString);

                        const responseMessage = await awaitUserNextMessage(this.channel, user, 60000);

                        if (responseMessage) {
                            selection.value.addAtPointer(responseMessage.content);

                            safeDeleteMessage(responseMessage);
                        }

                        safeDeleteMessage(promptMessage);
                    }
                    else {
                        selection.value.addAtPointer(new EditableDocument(selection.fieldInfo.arrayType));
                    }
                }
            }
        }

        // Update the message's embed
        this.setEmbed(this.buildEmbed());
    }

    // Gets the document immediately after the user submits it
    public getNextSubmission(): Promise<EditableDocument | undefined> {
        // Construct a promise that will resolve when the document is provided
        const documentPromise: Promise<EditableDocument | undefined> = new Promise(resolve => {
            // If the message deactivates before the document is submitted
            this.emitter.once('deactivated', () => {
                resolve(undefined);
            });

            // When the user submits the document
            this.emitter.once('submit', (document: EditableDocument) => {
                // Return the final document
                resolve(document);
            });
        });
        
        return documentPromise;
    }

    protected async deactivate(): Promise<void> {
        // Inherit parent deactivation behavior
        super.deactivate();

        const message = this.getMessage() as Message;
        const embed = message.embeds[0];

        // Get the embed's footer
        const footer = embed.footer;

        // Append the deactivated info to the end of the message's footer
        const newEmbed = embed.setFooter(`${footer ? `${footer.text} ` : ''}(deactivated)`);

        try {
            // Update the message
            await message.edit(newEmbed);
        }
        catch (error) {
            console.error('Error trying to edit an embed on an interactive message.', error);
        }
    }
}