import { Player } from "@Easy/Core/Shared/Player/Player";
import { IUseableItem } from "../IUseableItem";
import WorldObjectAnimationData from "./WorldAnimationData";
import WorldObjectAudioData from "./WorldObjectAudioData";
import { ReturnSuccess } from "Code/Logger";
import { WorldType } from "Code/World/World";
import WorldManager from "Code/World/WorldManager";
import StringUtils from "@Easy/Core/Shared/Types/StringUtil";
import ItemData from "../Item/ItemData";
import InventoryManager from "Code/InventoryManager/InventoryManager";
import { PlacementGhost } from "Code/World/PlacementGhost";
import { Game } from "@Easy/Core/Shared/Game";

@CreateAssetMenu("Industrio/World Object/World Object")
export default class WorldObjectData extends AirshipScriptableObject implements IUseableItem {
    @NonSerialized() public item: ItemData;
    @NonSerialized() public timeout: number = 0.05;
    @NonSerialized() public continualUseEnabled: boolean = false;
    public isSupportive: boolean = true;
    public requireSupport: boolean = false;
    public canRotate: boolean = false;
    public canRotateNormal: boolean = false;
    public voxelDefinition: VoxelBlockDefinition;
    public components: AirshipScriptableObject[] = [];
    public size: Vector3 = Vector3.one;
    public origin: Vector3 = Vector3.zero;
    public occupancy: Vector3[] = [];
    public floorSupport: Vector3[] = [];
    public view?: GameObject;
    public audio: WorldObjectAudioData;
    public animation: WorldObjectAnimationData;

    public Initialize(item: ItemData): void {
        this.item = item;
        this.origin = this.origin.add(new Vector3(0, this.size.y - 1, 0));
        for (let x = 0; x < this.size.x; x++) {
            for (let y = 0; y < this.size.y; y++) {
                for (let z = 0; z < this.size.z; z++) {
                    const vector = this.origin.sub(new Vector3(x, y, z));
                    if (this.occupancy.includes(vector)) continue;
                    this.occupancy.push(vector);
                }
            }
        }
        for (let x = 0; x < this.size.x; x++) {
            for (let z = 0; z < this.size.z; z++) {
                const vector = this.origin.sub(new Vector3(x, this.size.y, z));
                if (this.floorSupport.includes(vector)) continue;
                this.floorSupport.push(vector);
            }
        }
    }

    public OnEquipClient(player: Player): void {
        if (player !== Game.localPlayer) return;
        PlacementGhost.Create(this);
    }

    public OnUnequipClient(player: Player): void {
        if (player !== Game.localPlayer) return;
        PlacementGhost.ghost?.Destroy();
    }

    public CanUseServer(player: Player): ReturnSuccess {
        const raycast = WorldManager.Get().RequestClientRaycast(player, "Place");
        if (!raycast) return new ReturnSuccess(false, `No position targeted`);
        const world = WorldManager.Get().GetPlayerActiveWorldComponent(WorldType.InteractiveWorld, player);
        if (player.character!.movement.GetPosition().Distance(raycast.position) > world.maxInteractDistance) return new ReturnSuccess(false, `Player too far away!`);
        const worldObjectSave = world.CreateObjectSave(this.item, raycast.position, raycast.rotation, raycast.normal);
        const collisions = world.GetCollisions(worldObjectSave);
        if (!collisions.isEmpty()) return new ReturnSuccess(false, `Collision with ${StringUtils.ncifyVariableName(world.objects.get(collisions[0])!.type)}`);
        if (this.requireSupport) {
            const missingSupport = world.GetMissingFloor(worldObjectSave);
            if (!missingSupport.isEmpty()) return new ReturnSuccess(false, `Missing support at ${missingSupport[0]}`);
        }
        if (!InventoryManager.Get().TryModifyPlayerItems(player, this.item.identity.id, -1)) return new ReturnSuccess(false, `Missing '${this.item.identity.displayName}'`);
        return new ReturnSuccess(true);
    }

    public OnUseServer(player: Player): void {
        const raycast = WorldManager.Get().RequestClientRaycast(player, "Place");
        if (!raycast) return;
        const world = WorldManager.Get().GetPlayerActiveWorldComponent(WorldType.InteractiveWorld, player);
        world.PlaceBlock(this.item, raycast!.position, raycast?.normal ?? 0, raycast?.rotation ?? 0);
    }
}