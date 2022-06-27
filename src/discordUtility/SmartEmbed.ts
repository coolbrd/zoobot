import { MessageEmbed } from "discord.js";

// A child of MessageEmbed that just appends some overflow text to fields that have exceeded their limits
export default class SmartEmbed extends MessageEmbed {
    private readonly overFlowString = " . . .";

    public setTitle(title: string): this {
        const maxLength = 256;
        if (title.length > maxLength) {
            title = title.substring(0, maxLength - this.overFlowString.length - 1) + this.overFlowString;
        }

        super.setTitle(title);

        return this;
    }

    public setDescription(description: string): this {
        const maxLength = 2048;
        if (description.length > maxLength) {
            description = description.substring(0, maxLength - this.overFlowString.length - 1) + this.overFlowString;
        }

        super.setDescription(description);
        
        return this;
    }

    public addField(name: string, value: string, inline?: boolean): this {
        const nameMaxLength = 256;
        if (name.length > nameMaxLength) {
            name = name.substring(0, nameMaxLength - this.overFlowString.length - 1) + this.overFlowString;
        }

        const valueMaxLength = 1024;
        if (value.length > valueMaxLength) {
            value = value.substring(0, valueMaxLength - this.overFlowString.length - 1) + this.overFlowString;
        }

        super.addField(name, value, inline);

        return this;
    }

    public appendToFooter(value: string): this {
        const footerText = this.footer && this.footer.text || "";
        this.setFooter({ text: footerText + value })
        return this;
    }
}