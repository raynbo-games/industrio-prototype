import { WorldObjectPlacementData, WorldSave } from "Code/PlayerDataManager/PlayerSave";
import PlayerDataManager, { PlayerStatesServer } from "Code/PlayerDataManager/PlayerDataManager";
import ObjectUtils from "@Easy/Core/Shared/Util/ObjectUtils";
import InteractiveWorld from "../InteractiveWorld/InteractiveWorld";
import { Platform } from "@Easy/Core/Shared/Airship";
import InventoryManager from "Code/InventoryManager/InventoryManager";
import WorldObjectItem from "Code/InventoryManager/Item/WorldObjectItem";
import WorldObjectDataItem from "Code/InventoryManager/Item/WorldObjectDataItem";
import { Player } from "@Easy/Core/Shared/Player/Player";

@AirshipComponentMenu("World/Player World")
export default class PlayerWorld extends InteractiveWorld {
    public save: WorldSave;

    /**
     * Loads a world from the owner's save
     */
    @Server()
    public LoadWorld(player: Player, id: number): void {
        const state = PlayerDataManager.Get().GetPlayerState<PlayerStatesServer>(player);
        if (state.save.world in state.save.profiles[state.save.profile].worlds) {
            this.save = state.save.profiles[state.save.profile].worlds[state.save.world];
        } else {
            const defaultSave = Platform.Server.DataStore.GetKey<WorldSave>(`DEFAULT_WORLD:${state.save.world}`).await()!;
            if (defaultSave[0] && defaultSave[1]) { 
                this.save = defaultSave[1];
            } else {
                this.save = {
                    owner: player.userId,
                    world: state.save.world,
                    authorizedUserIds: [player.userId],
                    objectData: [
                        {
                            type: "Bedrock",
                            position: new Vector3(-10, -3, -10),
                            size: new Vector3(21, 1, 21),
                        },
                        {
                            type: "Stone",
                            position: new Vector3(-10, -2, -10),
                            size: new Vector3(21, 2, 21),
                        },
                        {
                            type: "Grass",
                            position: new Vector3(-10, 0, -10),
                            size: new Vector3(21, 1, 21),
                        },
                    ],
                }
            }
        }
        this.LoadState(player, id, this.save);
        this.save.objectData.forEach((worldObjectSave) => {
            const item = InventoryManager.Get().Items.get(worldObjectSave.type)?.gameObject.GetAirshipComponent<WorldObjectItem>();
            if (!item) return;
            const loadedWorldObject = this.CreateObjectSave(item, worldObjectSave.position, worldObjectSave.rotation, worldObjectSave.normal);
            if (worldObjectSave.size) {
                for (let y = 0; y < worldObjectSave.size.y; y++) {
                    for (let z = 0; z < worldObjectSave.size.z; z++) {
                        for (let x = 0; x < worldObjectSave.size.x; x++) {
                            const copiedLoadedWorldObject = ObjectUtils.deepCopy(loadedWorldObject);
                            copiedLoadedWorldObject.position = copiedLoadedWorldObject.position.add(new Vector3(x, y, z));
                            this.AddBlock(item, copiedLoadedWorldObject);
                        }
                    }
                }
            } else {
                this.AddBlock(item, loadedWorldObject);
            }
        })
    }

    public CheckSameBlock(blockA: WorldObjectPlacementData, blockB: WorldObjectPlacementData): boolean {
        if (blockA.type !== blockB.type) return false;
        if (blockA.rotation !== blockB.rotation) return false;
        if (blockA.normal !== blockB.normal) return false;
        if (json.encode(blockA.data) !== json.encode(blockB.data)) return false;
        return true;
    }

    public CheckSizedBlockY(objects: Map<Vector3, WorldObjectPlacementData>, basePosition: Vector3, baseObject: WorldObjectPlacementData, maxSizeX: number, maxSizeZ: number, sizeY: number): boolean {
        for (let sizeZ = 0; sizeZ < maxSizeZ; sizeZ++) {
            if (!this.CheckSizedBlockZ(objects, basePosition.add(new Vector3(0, sizeY, 0)), baseObject, maxSizeX, sizeZ)) return false;
        }
        return true;
    }

    public CheckSizedBlockZ(objects: Map<Vector3, WorldObjectPlacementData>, basePosition: Vector3, baseObject: WorldObjectPlacementData, maxSizeX: number, sizeZ: number): boolean {
        for (let sizeX = 0; sizeX < maxSizeX; sizeX++) {
            if (!this.CheckSizedBlockX(objects, basePosition.add(new Vector3(0, 0, sizeZ)), baseObject, sizeX)) return false;
        }
        return true;
    }

    public CheckSizedBlockX(objects: Map<Vector3, WorldObjectPlacementData>, basePosition: Vector3, baseObject: WorldObjectPlacementData, sizeX: number): boolean {
        const obj = objects.get(basePosition.add(new Vector3(sizeX, 0, 0)));
        return obj ? this.CheckSameBlock(baseObject, obj) : false;
    }

    public SaveSizedBlock(objects: Map<Vector3, WorldObjectPlacementData>, baseObject: WorldObjectPlacementData): WorldObjectPlacementData {
        const item = InventoryManager.Get().Items.get(baseObject.type)!.gameObject.GetAirshipComponent<WorldObjectItem>()!;
        
        let pass = true;
        let sizeX = 1;
        while (pass) {
            pass = this.CheckSizedBlockX(objects, baseObject.position, baseObject, sizeX);
            if (pass) sizeX += 1;
        }
        pass = true;
        let sizeZ = 1;
        while (pass) {
            pass = this.CheckSizedBlockZ(objects, baseObject.position, baseObject, sizeX, sizeZ);
            if (pass) sizeZ += 1;
        }
        pass = true;
        let sizeY = 1;
        while (pass) {
            pass = this.CheckSizedBlockY(objects, baseObject.position, baseObject, sizeX, sizeZ, sizeY);
            if (pass) sizeY += 1;
        }

        const size = new Vector3(sizeX, sizeY, sizeZ);
        const worldObjectSave = this.CreateObjectSave(item, baseObject.position, baseObject.rotation, baseObject.normal);
        if (size === Vector3.one) return worldObjectSave;
        worldObjectSave.size = new Vector3(sizeX, sizeY, sizeZ);
        return worldObjectSave;
    }

    public SaveSizedBlocks(): WorldObjectPlacementData[] {
        const objects = ObjectUtils.deepCopy(this.objects);
        const sizedObjects: WorldObjectPlacementData[] = [];
        let startPosX = 0;
        let endPosX = 0;
        let startPosY = 0;
        let endPosY = 0;
        let startPosZ = 0;
        let endPosZ = 0;
        objects.keys().forEach((pos) => {
            if (pos.x < startPosX) startPosX = pos.x;
            if (pos.x > endPosX) endPosX = pos.x;
            if (pos.y < startPosY) startPosY = pos.y;
            if (pos.y > endPosY) endPosY = pos.y;
            if (pos.z < startPosZ) startPosZ = pos.z;
            if (pos.z > endPosZ) endPosZ = pos.z;
        });

        for (let x = startPosX; x <= endPosX; x++) {
            for (let y = startPosY; y <= endPosY; y++) {
                for (let z = startPosZ; z <= endPosZ; z++) {
                    const position = new Vector3(x, y, z);
                    const object = objects.get(position);
                    if (!object) continue;
                    let sizedObject = this.SaveSizedBlock(objects, object);
                    const dataItem = InventoryManager.Get().Items.get(sizedObject.type)?.gameObject.GetAirshipComponent<WorldObjectDataItem>();
                    if (dataItem) {
                        if (sizedObject.data) sizedObject = dataItem.SaveData(sizedObject);
                    }
                    for (let objX = sizedObject.position!.x; objX < sizedObject.position!.x + (sizedObject.size?.x ?? 1); objX++) {
                        for (let objY = sizedObject.position!.y; objY < sizedObject.position!.y + (sizedObject.size?.y ?? 1); objY++) {
                            for (let objZ = sizedObject.position!.z; objZ < sizedObject.position!.z + (sizedObject.size?.z ?? 1); objZ++) {
                                objects.delete(new Vector3(objX, objY, objZ));
                            }
                        }   
                    }
                    sizedObjects.push(sizedObject);
                }
            }
        }

        return sizedObjects;
    }

    /**
     * Serializes the world into a player world save.
     * @returns The world save
     */
    public SaveWorld(): WorldSave {
        this.save.objectData = this.SaveSizedBlocks();
        return this.save;
    }

    OnDestroy(): void {
        this.state.Destroy();
    }
}
