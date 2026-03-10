import State, { BaseState } from "Code/State";
import { WorldSave } from "Code/PlayerDataManager/PlayerSave";
import { Player } from "@Easy/Core/Shared/Player/Player";

export interface InteractiveWorldStateShared extends BaseState {
    ownerId: string,
    authorizedUserIds: string[],
    visitorIds: string[],
}

export default class InteractiveWorldState extends State<InteractiveWorldStateShared, InteractiveWorldStateShared> {
    public name: string = "Inventory";

    public constructor(player: Player, stateId: string, worldSave?: WorldSave) {
        super();
        const initialState: InteractiveWorldStateShared = {
            ownerId: $CLIENT ? "" : (worldSave ? worldSave.owner : ""),
            authorizedUserIds: $CLIENT ? [] : (worldSave ? worldSave.authorizedUserIds : []),
            visitorIds: $CLIENT ? [] : (worldSave ? [worldSave.owner] : [player.userId]),
        }
        this.InitializeState(stateId, initialState, initialState);
    }
}