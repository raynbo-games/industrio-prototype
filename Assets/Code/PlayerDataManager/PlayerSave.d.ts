import { WorldObjectNormal, WorldObjectRotation } from "Code/World/RotationValues";
import SaveDataSet, { GlobalSaveDataKnown } from "./SaveDataSet";

export interface InventoryItemSave {
    slot: number,
    quantity: number,
}

export type DataStoreStoredBaseValueType = number | string;
export type DataStoreStoredKeyType = number | string;

export type DataStoreStoredValueType = DataStoreStoredBaseValueType | DataStoreStoredBaseValueType[] | DataStoreStoredValueType[] | {
    [key: DataStoreStoredKeyType]: DataStoreStoredValueType,
};

export type WorldObjectSavedData = {
    [key: DataStoreStoredKeyType]: DataStoreStoredValueType,
}

export type WorldObjectPlacementData = {
    type: string,
    position: Vector3,
    rotation?: WorldObjectRotation,
    normal?: WorldObjectNormal,
    data?: WorldObjectSavedData,

    /**Datastore only */
    size?: Vector3,
};

export interface WorldSave {
    owner: string,
    authorizedUserIds: string[],
    world: string,
    objectData: WorldObjectPlacementData[],
}

export interface PlayerSaveProfile {
    credits: number,
    inventory: {
        [itemId: number]: InventoryItemSave,
    },
    worlds: {
        [worldName: string]: WorldSave;
    }
}

export interface PlayerSave extends GlobalSaveDataKnown {
    userId: string,
    world: string,
    profile: string,
    profiles: {
        [key: string]: PlayerSaveProfile,
    },
}

const DefaultPlayerSave: PlayerSave = {
    version: 0,
    userId: "",
    world: "Industria",
    profile: "0",
    profiles: {
        "0": {
            credits: 0,
            inventory: {},
            worlds: {}
        }
    }
}

export const PlayerSaveUtility = new SaveDataSet<PlayerSave>(
    "player",
    {
        0: () => DefaultPlayerSave,
    }
);