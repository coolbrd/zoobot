import MasterBeastiaryProcess from "./bot/MasterBeastiaryProcess";

const master = new MasterBeastiaryProcess();

master.init().catch(() => {
    process.exit();
});