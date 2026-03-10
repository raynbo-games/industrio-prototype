import WorldManager from "Code/World/WorldManager";
import { IUseableItem } from "../IUseableItem";
import { WorldType } from "Code/World/World";
import { Player } from "@Easy/Core/Shared/Player/Player";
import { MathUtil } from "@Easy/Core/Shared/Util/MathUtil";
import { SelectionGhost } from "Code/World/SelectionGhost";
import { ReturnSuccess } from "Code/Logger";
import ItemData from "../Item/ItemData";
import { Game } from "@Easy/Core/Shared/Game";

export enum MiningTool {
    Pickaxe,
    Axe,
}

@CreateAssetMenu("Industrio/Tool/Mining Tool")
export default class MiningToolData extends AirshipScriptableObject implements IUseableItem {
    @NonSerialized() public continualUseEnabled: boolean = false;
    public item: ItemData;
    public type: MiningTool = MiningTool.Pickaxe;
    public damage: number = 1;
    public timeout: number = 0.5;
    public swingAnimation: AnimationClip;
    public swingSound: AudioClip;

    public Initialize(item: ItemData) {
        this.item = item;
    }

    public OnEquipClient(player: Player): void {
        if (player !== Game.localPlayer) return;
        const world = WorldManager.Get().GetPlayerActiveWorldComponent(WorldType.InteractiveWorld, player);
        SelectionGhost.Create(world);
    }

    public OnUnequipClient(player: Player): void {
        if (player !== Game.localPlayer) return;
        SelectionGhost.ghost?.Destroy();
    }

    public CanUseServer(player: Player): ReturnSuccess {
        const raycast = WorldManager.Get().RequestClientRaycast(player, "Select");
        if (!raycast) return new ReturnSuccess(false, "No target");
        const world = WorldManager.Get().GetPlayerActiveWorldComponent(WorldType.InteractiveWorld, player);
        if (player.character!.movement.GetPosition().Distance(raycast.position) > world.maxInteractDistance) return new ReturnSuccess(false, "Too far away");
        return new ReturnSuccess(true);
    }

    public OnUseServer(player: Player): void {
        const raycast = WorldManager.Get().RequestClientRaycast(player, "Select");
        if (!raycast) return;
        const world = WorldManager.Get().GetPlayerActiveWorldComponent(WorldType.InteractiveWorld, player);
        const worldObjectSave = world.SelectRootPositionByOccupancy(raycast.position);
        if (!worldObjectSave) return;
        world.PlayerDeleteBlock(player, MathUtil.RoundVec(raycast.position));
    }
}