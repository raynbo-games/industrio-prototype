import State, { BaseState } from "Code/State";
import { PlayerSave } from "./PlayerSave";
import { WorldObjectRotation } from "Code/World/RotationValues";

export interface PlayerStateShared extends BaseState {
    credits: number,
    equippedItem: number,
    worldId: number,
}

export interface PlayerStateClient extends PlayerStateShared {
    rotation: WorldObjectRotation,
}

export default class PlayerState extends State<PlayerStateClient, PlayerStateShared> {
    public name: string = "Player";

    public constructor(stateId: string, save?: PlayerSave) {
        super();
        
        let initialSharedState: PlayerStateShared;
        if (save) {
            initialSharedState = {
                credits: save.profiles[save.profile].credits,
                equippedItem: -1,
                worldId: -1,
            }
        } else {
            initialSharedState = {
                credits: 0,
                equippedItem: -1,
                worldId: -1,
            }
        }

        const initialClientState: PlayerStateClient = {
            ...initialSharedState,
            rotation: WorldObjectRotation.Front,
        }

        this.InitializeState(stateId, initialClientState, initialSharedState);
    }
}