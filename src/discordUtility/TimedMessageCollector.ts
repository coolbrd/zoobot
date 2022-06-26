import { DMChannel, Message, MessageCollector, TextChannel, User } from "discord.js";

type MessageFilter = (message: Message) => boolean;

export default class TimedMessageCollector {
    private channel: TextChannel | DMChannel | undefined;
    private user: User | undefined;
    private filter: MessageFilter = (_message => true);

    public collectIn(channel: TextChannel | DMChannel): this {
        this.channel = channel;
        return this;
    }

    public collectFrom(user: User): this {
        this.user = user;
        return this;
    }

    public collectBy(filter: MessageFilter): this {
        this.filter = filter;
        return this;
    }

    public async collectOne(maxTime: number): Promise<Message | undefined> {
        if (!this.channel) {
            throw new Error("A TimedUserMessageCollector was started before its channel was initialized.");
        }

        if (!this.user) {
            throw new Error("A TimedUserMessageCollector was started before its user was initialized.");
        }

         const collector = new MessageCollector(this.channel, { filter: (message: Message) => {
            return message.author === this.user;
         }});

        return new Promise(resolve => {
            const stopAndResolve = (resolution: Message | undefined) => {
                collector.stop();

                resolve(resolution);
            }

            setTimeout(() => {
                stopAndResolve(undefined);
            }, maxTime);

            collector.on("collect", message => {
                if (this.filter(message)) {
                    stopAndResolve(message);
                }
            });
        });
    }
}