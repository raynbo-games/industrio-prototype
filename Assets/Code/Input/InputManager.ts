import { Airship } from "@Easy/Core/Shared/Airship";
import { Game } from "@Easy/Core/Shared/Game";
import { Binding } from "@Easy/Core/Shared/Input/Binding";
import { Keyboard, Mouse } from "@Easy/Core/Shared/UserInput";
import InventoryManager from "Code/InventoryManager/InventoryManager";
import Logger, { ReturnSuccess } from "Code/Logger";
import PlayerDataManager from "Code/PlayerDataManager/PlayerDataManager";
import PlayerGUI from "Code/PlayerGUI/PlayerGUI";
import { PlacementGhost } from "Code/World/PlacementGhost";
import { WorldObjectRotation } from "Code/World/RotationValues";
import { SelectionGhost } from "Code/World/SelectionGhost";
import { WorldType } from "Code/World/World";
import WorldManager from "Code/World/WorldManager";
import CharacterAnimation from "./CharacterAnimation";
import { Player } from "@Easy/Core/Shared/Player/Player";
import { IUseableItem } from "Code/Data/IUseableItem";
import { SetTimeout } from "@Easy/Core/Shared/Util/Timer";
import ItemManager from "Code/InventoryManager/ItemManager";

@AirshipComponentMenu("Singletons/Input Manager")
export default class InputManager extends AirshipSingleton {

    public holdItemAnimation: CharacterAnimation;
    public useItemAnimation: CharacterAnimation;

    @NonSerialized() public timeouts: Player[] = [];

    protected Awake(): void {
        Airship.Input.CreateAction("Use", Binding.MouseButton(MouseButton.LeftButton));
        Airship.Input.CreateAction("Backpack", Binding.Key(Key.E));
        Airship.Input.CreateAction("Rotate", Binding.Key(Key.R));
        if (Game.IsMobile()) Airship.Input.CreateMobileButton("Backpack", new Vector2(-320, 80));
        Airship.Input.CreateAction("Interact", Binding.Key(Key.F));
        Airship.Input.CreateAction("Sprint", Binding.Key(Key.LeftShift));
        Airship.Input.CreateAction("Toggle Mouse Lock", Binding.Key(Key.LeftAlt));

        Airship.Input.OnDown("Toggle Mouse Lock").Connect(() => {
            const clear = Mouse.AddUnlocker();
            Airship.Input.OnUp("Toggle Mouse Lock").Once(() => clear());
        });

        Airship.Input.OnDown("Use").Connect(() => {
            if (PlayerGUI.Get().IsActive()) return;
            const state = PlayerDataManager.Get().GetLocalState().state;
            const equippedItem = state.GetKey("equippedItem");
            const useableItem = ItemManager.Get().GetUseableItem(equippedItem);
            if (!useableItem) return;
            let down = true;
            state.OnceKeyUpdated("equippedItem", () => down = false);
            Airship.Input.OnUp("Use").Once(() => down = false);

            while (down) {
                const status = this.Use(useableItem, Game.localPlayer);
                if (!status.success) Logger.Get().DebugPrint(status.value);
                if (!useableItem.continualUseEnabled) break;
                task.wait(useableItem.timeout);
            }
        });

        Airship.Input.OnDown("Rotate").Connect(() => {
            PlayerDataManager.Get().GetLocalState().state.UpdateKey("rotation", (rotation) => {
                switch(rotation) {
                    case WorldObjectRotation.Front:
                        return WorldObjectRotation.Right;
                    case WorldObjectRotation.Right:
                        return WorldObjectRotation.Back;
                    case WorldObjectRotation.Back:
                        return WorldObjectRotation.Left;
                    case WorldObjectRotation.Left:
                        return WorldObjectRotation.Front;
                }
                throw Logger.Get().Error(`Invalid rotation: ${rotation}`)

            })
        });

        Airship.Input.OnDown("Backpack").Connect(() => {
            PlayerGUI.Get().inventoryUI.ToggleBackpack();
        });

        Airship.Input.OnDown("Interact").Connect(() => {
            if (PlayerGUI.Get().view) return Destroy(PlayerGUI.Get().view!.gameObject);
            if (PlayerGUI.Get().IsActive()) return;
            const interactiveVoxelWorld = WorldManager.Get().TryGetPlayerActiveWorldComponent(WorldType.InteractiveWorld, Game.localPlayer);
            if (!interactiveVoxelWorld) return;
            const res = interactiveVoxelWorld.RaycastBlock("Select");
            if (!res) return;
            PlayerGUI.Get().OpenWorldObjectView(res.position);
        });

        for (let slotNumber = 0; slotNumber < PlayerGUI.Get().inventoryUI.toolbarUI.slots.size(); slotNumber++) {
            
            Keyboard.OnKeyDown(41 + slotNumber, () => {
                PlayerGUI.Get().inventoryUI.EquipToolbarSlotByNumber(slotNumber);
            });

            Keyboard.OnKeyDown(85 + slotNumber, () => {
                PlayerGUI.Get().inventoryUI.EquipToolbarSlotByNumber(slotNumber);
            });
        }
    }

    protected Update(): void {
        if (PlacementGhost.ghost) PlacementGhost.ghost.Update();
        if (SelectionGhost.ghost) SelectionGhost.ghost.Update();
        if(Input.touchCount > 0 && Input.GetTouch(0).phase === TouchPhase.Began) {
            const state = PlayerDataManager.Get().GetLocalState().state;
            const equippedItem = state.GetKey("equippedItem");
            const useableItem = ItemManager.Get().GetUseableItem(equippedItem)
            if (!useableItem) return;
            const status = this.Use(useableItem, Game.localPlayer);
            if (!status.success) Logger.Get().DebugPrint(status.value);
        }
    }

    public Use(useableItem: IUseableItem, player: Player): ReturnSuccess {
            if (!player.character) return new ReturnSuccess(false, `No character`);
            let result: ReturnSuccess;
            if (useableItem.CanUse) {
                result = useableItem.CanUse(player);
                if (!result.success) return result;
            }
            if (this.timeouts.includes(player)) return new ReturnSuccess(false, `Your using '${useableItem.item.identity.displayName}' too fast`);
            this.timeouts.push(player);
            SetTimeout(useableItem.timeout, () => this.timeouts = this.timeouts.filter(p => p !== player));
            const playerWorld = WorldManager.Get().TryGetPlayerActiveWorldComponent(WorldType.PlayerWorld, player);
            if (!playerWorld || !playerWorld.IsAuthorized(player)) return new ReturnSuccess(false, `You are not authorized to use '${useableItem.item.identity.displayName}'`);
            if (PlayerDataManager.Get().GetPlayerState(player).inventory.GetKey(useableItem.item.identity.id).quantity === 0) return new ReturnSuccess(false, `You do not have any '${useableItem.item.identity.displayName}'`);
            if ($CLIENT) {
                if (useableItem.CanUseClient) {
                    result = useableItem.CanUseClient(player);
                    if (!result.success) return result;
                }
                const output = InventoryManager.Get().onItemUsedNetworkNetFunc.client.FireServer(useableItem.item.identity.id);
                if (!output[0]) return new ReturnSuccess(false, output[1]);
                useableItem.OnUseClient?.(player);
                InputManager.Get().useItemAnimation.Play(player);
                return new ReturnSuccess(true);
            }
            if ($SERVER) {
                if (useableItem.CanUseServer) {
                    result = useableItem.CanUseServer(player);
                    if (!result.success) return result;
                }
                useableItem.OnUseServer?.(player);
                return new ReturnSuccess(true);
            }
            return new ReturnSuccess(false);
        }
}