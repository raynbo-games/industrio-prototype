import { Player } from "@Easy/Core/Shared/Player/Player";
import { PlayerSave, PlayerSaveUtility, WorldSave } from "./PlayerSave";
import PlayerState from "./PlayerState";
import PlayerInventoryState from "Code/InventoryManager/PlayerInventoryState";
import { Game } from "@Easy/Core/Shared/Game";
import Logger from "Code/Logger";
import InventoryManager from "Code/InventoryManager/InventoryManager";

export interface PlayerStatesServer {
    save: PlayerSave,
    state: PlayerState,
    inventory: PlayerInventoryState,
}

export interface PlayerStatesClient {
    state: PlayerState,
    inventory: PlayerInventoryState,
}

@AirshipComponentMenu("Singletons/Player Data Manager")
export default class PlayerDataManager extends AirshipSingleton {

    @NonSerialized()
    public playerStates = new Map<Player, PlayerStatesClient | PlayerStatesServer>();

    @Client()
    public InitializeLocalPlayerStates(): PlayerStatesClient {
        if (this.playerStates.has(Game.localPlayer)) throw Logger.Get().Error(`Cannot initialize local player state twice!`)
        const inventoryState = new PlayerInventoryState(Game.localPlayer.userId);
        const playerState = new PlayerState(Game.localPlayer.userId);
        const states = {
            state: playerState,
            inventory: inventoryState,
        }
        this.playerStates.set(Game.localPlayer, states);
        return states;
    }

    @Client()
    public GetLocalState(): PlayerStatesClient {
        return this.playerStates.get(Game.localPlayer) as PlayerStatesClient;
    }

    @Server()
    public InitializePlayerStates(player: Player): PlayerStatesServer | undefined {
        if (this.playerStates.has(player)) throw Logger.Get().Error(`Cannot initialize player state for ${player.username}!`)
        const save = PlayerSaveUtility.Get(player.userId, (save) => {
            const inventory = save.profiles[save.profile].inventory;
            InventoryManager.Get().Items.forEach((item) => {
                if (item.internalName in inventory) return;
                inventory[item.internalName] = {
                    slot: -1,
                    quantity: 0,
                }
            })
            return {
                ...save,
                profiles: {
                    ...save.profiles,
                    [save.profile]: {
                        ...save.profiles[save.profile],
                        inventory: inventory,
                    }
                }
            }
        });
        if (!save) return;
        
        const inventoryState = new PlayerInventoryState(player.userId, save);
        const playerState = new PlayerState(player.userId, save);

        const states = {
            save: save,
            state: playerState,
            inventory: inventoryState,
        }
        this.playerStates.set(player, states);
        return states;
    }

    @Server()
    public DestroyPlayerStates(player: Player, world?: WorldSave): void {
        const state = this.playerStates.get(player) as PlayerStatesServer;
        if (!state) return;

        const inventory = state.inventory.GetState();
        state.inventory.Destroy();
        state.state.Destroy();
        
        state.save.profiles[state.save.profile].inventory = inventory;
        if (world) state.save.profiles[state.save.profile].worlds[state.save.world] = world;

        PlayerSaveUtility.Set(player.userId, state.save);
        this.playerStates.delete(player);
    }

    public GetPlayerState<T extends PlayerStatesServer | PlayerStatesClient>(player: Player): T {
        return this.playerStates.get(player) as T;
    }
}