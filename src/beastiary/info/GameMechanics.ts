import { oneLine } from "common-tags";
import AnimalInfoCommand from "../../commands/AnimalInfoCommand";
import ChangeAnimalNicknameCommand from "../../commands/ChangeAnimalNicknameCommand";
import CrewCommand from "../../commands/Crew/CrewCommand";
import EncounterCommand from "../../commands/EncounterCommand";
import FishCommand from "../../commands/FishCommand";
import GiveXpCommand from "../../commands/GiveXpCommand";
import SetEncounterChannelCommand from "../../commands/SetEncounterChannelCommand";
import ViewCollectionCommand from "../../commands/ViewCollectionCommand";
import ViewEssenceCommand from "../../commands/ViewEssenceCommand";
import ViewTokensCommand from "../../commands/ViewTokensCommand";

interface GameMechanicInfo {
    names: string[],
    info: string
}

const mechanics: GameMechanicInfo[] = [
    {
        names: ["general", "how to play"],
        info: oneLine`
            The Beastiary is a bot that's all about collecting animals, cataloguing their species, and earning mastery over your
            favorites! Start playing by using the \`${EncounterCommand.primaryName}\` command to generate an animal encounter, and
            reacting to the encounter of an animal you want to capture. Once you've captured an animal, you can view their information
            with the \`${ViewCollectionCommand.primaryName}\` command, and customize them with the
            \`${ChangeAnimalNicknameCommand.primaryName}\` command (more customizations to come). Animals are worth money, too; you'll
            need that money to upgrade your collection's maximum capacity, so you can expand your menagerie even further!
        `
    },
    {
        names: ["beastiary"],
        info: oneLine`
            The Beastiary (not bestiary!) is the way you can track what species you've caught, which ones you own, which ones' tokens
            you have, and their level of completion. A Beastiary with lots of shiny badges and catalogued species is the goal here, so
            get to capturing!
        `
    },
    {
        names: ["encounters", "encounter"],
        info: oneLine`
            Encounters are the primary way to obtain new animals. When you see an encounter, you have 60 seconds to react to it before
            the animal will flee. Make sure you react quickly, someone else could get it first! You get 5 free encounters every 2
            hours, and can buy more using the shop command (for some currency, of course). Additionally, encounters occur randomly
            when there's message activity in the server. You can change the channel these encounters occur in using the
            \`${SetEncounterChannelCommand.primaryName}\` command.
        `
    },
    {
        names: ["captures", "capture"],
        info: oneLine`
            Capturing is how you claim an animal seen in an encounter for yourself. Once you've captured an animal, you can view its info
            with the \`${AnimalInfoCommand.primaryName}\` command, and its species gets marked in your Beastiary. Captured animal
            species aren't exclusive to the user that has them, so be sure to make up for that by having the highest level of every
            species in your server! You get one free capture every 4 hours, so be sure to use it wisely. Additional captures can be
            bought in the shop with pep.
        `
    },
    {
        names: ["animals", "animal"],
        info: oneLine`
            So you've caught an animal, what now? Well, you should give it a name! Nickname animals with the
            \`${ChangeAnimalNicknameCommand.primaryName}\` command and give them a funky sense of style. All animals start at level 1,
            and that's not very interesting. Plus, a higher-leveled animal is worth more pep when you release it! Learn more about
            gaining experience for your animals in the \`experience\` section.
        `
    },
    {
        names: ["experience", "xp", "leveling"],
        info: oneLine`
            Experience is the main way to distinguish how much cooler your animals are compared to everybody else's, and the way towards
            earning an animal's token. Starting at level 1, you can start gaining experience for your animals by adding them to your
            crew, which gives them some experience when you do things in your server! Every level beyond level 1 increases the animal's
            value by 10%. Each animal in your crew gets a little xp for every message you send in the server, and even more xp when you
            do things like using encounters, capturing, and fishing. You also get some free xp boosts every 3 hours, which you can give
            to any of your animals with \`${GiveXpCommand.primaryName}\`. Careful though, an animal that's hit its max level won't gain
            any xp, so keep earning that species essence so nothing goes to waste!
        `
    },
    {
        names: ["pep", "money"],
        info: oneLine`
            "Pep" is the primary currency in The Beastiary. It's used in the shop to buy extra encounters, captures, xp boosts, and
            collection expanders. The best way to earn pep is by capturing an animal (the more rare, the better), leveling it up a bit,
            and releasing it back into the wild. You can also slowly earn pep by fishing, learn more in the \`fishing\` section.
        `
    },
    {
        names: ["essence"],
        info: oneLine`
            Essence is species-specific currency that never goes down, it's the best indicator for how much work you've put into any
            one species. The more essence you have for a species, the higher that species' level cap will be, allowing you to earn more
            essence and pep from leveling them up! Essence is also the path towards species badges, a prestigious set of color-coded
            medals awarded only to players who've really dedicated themselves to a species. Your species badges will be displayed in
            your Beastiary; earn one for your favorite species and show it off! All your species' essences can be viewed with the
            \`${ViewEssenceCommand.primaryName}\` command.
        `
    },
    {
        names: ["crew"],
        info: oneLine`
            Your crew is the spot where only your coolest animals hang out (or the ones whose tokens you want). You can only have 2
            animals in your crew at once, so choose wisely. Each animal in your crew gets a small amount of experience for every single
            message you send in their home server, so stay active! Crew animals also get xp when you do things like use encounters and
            captures. Manage your crew with the \`${CrewCommand.primaryName}\` command.
        `
    },
    {
        names: ["tokens", "token"],
        info: oneLine`
            Tokens are your reward for dedication to an animal. Every time one of your animals gains experience, it has a chance to drop
            its token, and that chance increases with the amount of experience the animal gains. Additionally, even if an animal is at
            its max level, it still has a chance to drop its token when earning xp (although the xp is not gained). Tokens are rare
            collectibles that every species has, think of them as a gift from that species for being so good to it. You can view your
            collected tokens with the \`${ViewTokensCommand.primaryName}\` command. Species whose tokens you've collected are also
            specially marked in your Beastiary, just to show off your hard work that much more.
        `
    },
    {
        names: ["fishing", "fish"],
        info: oneLine`
            Fishing is a way to semi-passively generate pep and experience when you don't have any other ways doing it. Start fishing
            using the \`${FishCommand.primaryName}\` command, and type \`reel\` when it says you have a bite. It's that simple! You can
            also specify how far out you want to cast, between 1 and 100 feet. Every channel has a daily random sweet spot where the
            fish bite faster, the closer you are the faster they bite. It's like a little game of hot and cold, find it to really start
            reeling them in!
        `
    }
];

export default mechanics;