import Logger from "Code/Logger";
import { PlayerSave } from "Code/PlayerDataManager/PlayerSave";
import State from "Code/State";

export default class PlayerInventoryState extends State<PlayerSave["profiles"][number]["inventory"], PlayerSave["profiles"][number]["inventory"]> {
    public name: string = "Inventory";

    public constructor(stateId: string, save?: PlayerSave) {
        super();
        let inventorySave: PlayerSave["profiles"][number]["inventory"] = {};
        if ($SERVER) {
            if (!save) Logger.Get().Error(`Must specify save on server when creating PlayerInventoryState`)
            inventorySave = save!.profiles[save!.profile].inventory;
        } else {
            inventorySave = {};
        }

        this.InitializeState(stateId, inventorySave, inventorySave);
    }
}