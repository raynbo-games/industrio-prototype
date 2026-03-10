import { NetworkFunction } from "@Easy/Core/Shared/Network/NetworkFunction";
import { NetworkSignal } from "@Easy/Core/Shared/Network/NetworkSignal";
import { Player } from "@Easy/Core/Shared/Player/Player";
import PlayerDataManager from "Code/PlayerDataManager/PlayerDataManager";
import { Airship } from "@Easy/Core/Shared/Airship";
import { GiveCommand } from "./GiveCommand";
import WorldManager from "Code/World/WorldManager";
import { WorldType } from "Code/World/World";
import { TakeCommand } from "./TakeCommand";
import ItemManager from "./ItemManager";
import InputManager from "Code/Input/InputManager";

@AirshipComponentMenu("Singletons/Inventory Manager")
export default class InventoryManager extends AirshipSingleton {

    //#region Signals
    public readonly onPlayerCraftItem = new NetworkFunction<[objectItemId: number, recipeIndex: number, quantity: number], [success: boolean]>("InventoryManager.onPlayerCraftItem");
    public readonly onItemUsedNetworkNetFunc = new NetworkFunction<[itemId: number], [success: boolean, msg?: string]>("InventoryManager.onItemUsedNetwork");
    public readonly onItemEquipChangedNetSignal = new NetworkSignal<[itemId: number, equipped: boolean, player?: string]>("InventoryManager.onItemEquipChanged");

    public readonly onClientEditSlotsNetSignal = new NetworkSignal<[itemId: number, slot: number]>("InventoryManager.onClientUpdateItemSlot");

    //#endregion

    protected Awake(): void {
        if ($SERVER) this.AwakeServer();
        if ($CLIENT) this.AwakeClient();
    }

    @Server()
    public AwakeServer(): void {
        this.onItemUsedNetworkNetFunc.server.SetCallback((player, itemId) => {
            const useableItem = ItemManager.Get().GetUseableItem(itemId);
            if (!useableItem) return [false, "Invalid item"];
            const result = InputManager.Get().Use(useableItem, player);
            return [result.success, result.value];
        });

        this.onItemEquipChangedNetSignal.server.OnClientEvent((player, itemId, status) => {
            const item = ItemManager.Get().TryGetItem(itemId);
            if (!item) return [false, "Invalid item"];
            
            if (status) {
                item.Equip(player);
                PlayerDataManager.Get().GetPlayerState(player).state.SetKey("equippedItem", itemId);
            } else { 
                item.Unequip(player);
                PlayerDataManager.Get().GetPlayerState(player).state.SetKey("equippedItem", -1);
            }
            this.onItemEquipChangedNetSignal.server.FireAllClients(itemId, status, player.userId);
        });

        this.onClientEditSlotsNetSignal.server.OnClientEvent((player, itemId, slot) => {
            const playerState = PlayerDataManager.Get().GetPlayerState(player);
            playerState.inventory.UpdateKey(itemId, (value) => {
                return {
                    ...value,
                    slot: slot,
                }
            })
        });

        this.onPlayerCraftItem.server.SetCallback((player, objectItemId, recipeIndex, quantity) => {
            const world = WorldManager.Get().GetPlayerActiveWorldComponent(WorldType.PlayerWorld, player);
            if (!world.IsAuthorized(player)) return false;
            const craftingTable = this.Items.get(objectItemId)?.gameObject.GetAirshipComponent<CraftingWorldObjectItem>();
            if (!craftingTable) return false;
            if (recipeIndex >= craftingTable.recipes.size()) return false;
            return craftingTable.recipes[recipeIndex].TryPlayerCraft(PlayerDataManager.Get().GetPlayerState(player).inventory, quantity);
        });

        if ($SERVER) {
            Airship.Chat.RegisterCommand(new GiveCommand());
            Airship.Chat.RegisterCommand(new TakeCommand());
        }
    }

    @Client()
    public AwakeClient(): void {
        this.onItemEquipChangedNetSignal.client.OnServerEvent((itemId, status, userId) => {
            if (!userId) return;
            const player = Airship.Players.FindByUserId(userId);
            if (!player) return;
            const item = ItemManager.Get().GetItem(itemId);
            if (!player.character || !item.accessory) return;
            if (status) {
                player.character!.accessoryBuilder.Add(item.accessory!);
            } else {
                player.character.accessoryBuilder.RemoveBySlot(item.accessory.accessorySlot);
            }
        });
    }

    /**
     * tries to modify the quantity of an item in the players inventory.
     * 
     * Fails if the expected quantity is less than 0.
     * 
     * @param itemId The id of the item to modify.
     * @param quantity The quantity change in number form.
     * @returns true if the items is modified else false.
     */
    @Server()
    public TryModifyPlayerItems(player: Player, itemId: number, quantity: number): boolean {
        const playerState = PlayerDataManager.Get().GetPlayerState(player);
        let success = false;
        playerState.inventory.UpdateKey(itemId, (value) => {
            if (value.quantity + quantity < 0) return value;
            success = true;
            return {
                ...value,
                quantity: value.quantity + quantity,
            }
        });
        return success;
    }
}
