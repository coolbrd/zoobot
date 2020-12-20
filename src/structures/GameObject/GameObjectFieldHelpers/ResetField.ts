import GameObject from "../GameObject";

export default class ResetField {
    protected gameObject: GameObject;
    protected lastResetFieldName: string;
    protected basePeriod: number;
    protected premiumPeriodModifier = 1;
    protected getPremium: () => boolean = () => false;

    constructor(info: {
        gameObject: GameObject,
        lastResetFieldName: string,
        basePeriod: number,
        premiumPeriodModifier?: number,
        getPremium?: () => boolean
    }) {
        this.gameObject = info.gameObject;
        this.lastResetFieldName = info.lastResetFieldName;
        this.basePeriod = info.basePeriod;

        if (info.premiumPeriodModifier) {
            this.premiumPeriodModifier = info.premiumPeriodModifier;
        }

        if (info.getPremium) {
            this.getPremium = info.getPremium;
        }
    }

    protected applyPremiumModifier(x: number, modifier: number): number {
        if (this.getPremium()) {
            x *= modifier;
        }

        return x;
    }

    public get lastReset(): Date {
        return this.gameObject.document.get(this.lastResetFieldName);
    }

    public set lastReset(lastReset: Date) {
        this.gameObject.setDocumentField(this.lastResetFieldName, lastReset);
    }

    public get period(): number {
        return this.applyPremiumModifier(this.basePeriod, this.premiumPeriodModifier);
    }

    public get nextReset(): Date {
        return this.gameObject.beastiaryClient.beastiary.resets.getNextResetByPeriod(this.period);
    }

    public get periodsSinceLastReset(): number {
        const lastGlobalReset = this.gameObject.beastiaryClient.beastiary.resets.getLastResetByPeriod(this.period);
        return this.gameObject.beastiaryClient.beastiary.resets.getPeriodsSinceLastReset(this.lastReset, lastGlobalReset, this.period);
    }

    public get hasReset(): boolean {
        return this.periodsSinceLastReset > 0;
    }

    public applyReset(): void {
        if (this.periodsSinceLastReset > 0) {
            this.lastReset = new Date();
        }
    }
}