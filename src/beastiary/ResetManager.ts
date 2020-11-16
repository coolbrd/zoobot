import gameConfig from "../config/gameConfig";
import { todaysMilliseconds } from "../utility/timeStuff";

export default class ResetManager {
    private getLastResetByPeriod(period: number): Date {
        const now = new Date();

        const millisecondsSinceLastReset = todaysMilliseconds() % period;

        return new Date(now.valueOf() - millisecondsSinceLastReset);
    }

    private getNextResetByPeriod(period: number): Date {
        return new Date(this.getLastResetByPeriod(period).valueOf() + period);
    }

    public get lastCaptureReset(): Date {
        return this.getLastResetByPeriod(gameConfig.capturePeriod);
    }

    public get nextCaptureReset(): Date {
        return this.getNextResetByPeriod(gameConfig.capturePeriod);
    }

    public get lastEncounterReset(): Date {
        return this.getLastResetByPeriod(gameConfig.encounterPeriod);
    }

    public get nextEncounterReset(): Date {
        return this.getNextResetByPeriod(gameConfig.encounterPeriod)
    }

    public get lastXpBoostReset(): Date {
        return this.getLastResetByPeriod(gameConfig.xpBoostPeriod);
    }

    public get nextXpBoostReset(): Date {
        return this.getNextResetByPeriod(gameConfig.xpBoostPeriod);
    }
}