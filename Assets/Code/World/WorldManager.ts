import { Asset } from "@Easy/Core/Shared/Asset";
import { NetworkSignal } from "@Easy/Core/Shared/Network/NetworkSignal";
import { Player } from "@Easy/Core/Shared/Player/Player";
import { Signal } from "@Easy/Core/Shared/Util/Signal";
import { Game } from "@Easy/Core/Shared/Game";
import World, { WorldFromEnum, WorldServerType, WorldType } from "./World";
import Logger from "../Logger";
import { NetworkUtil } from "@Easy/Core/Shared/Util/NetworkUtil";
import PlayerDataManager from "Code/PlayerDataManager/PlayerDataManager";
import PlayerWorld from "./PlayerWorld/PlayerWorld";
import { NetworkFunction } from "@Easy/Core/Shared/Network/NetworkFunction";
import InteractiveWorld from "./InteractiveWorld/InteractiveWorld";
import { Airship } from "@Easy/Core/Shared/Airship";
import { SetDefaultWorldCommand } from "./SetDefaultWorldSave";
import { RaycastData } from "Code/InventoryManager/Item/UseableItem";
import { WorldObjectPlacementData } from "Code/PlayerDataManager/PlayerSave";

@AirshipComponentMenu("Singletons/World Manager")
export default class WorldManager extends AirshipSingleton {

	public onWorldLoadFinished = new Signal<[worldName: string]>();

    public onRequestClientRaycast = new NetworkFunction<[mode: "Place" | "Select"], [data?: RaycastData]>("WorldManager.onRequestClientRaycast");
	public onWorldLoadFinishedNetSignal = new NetworkSignal<[worldName: string, netId: number]>("WorldManager.onWorldLoadFinishedNetSignal");
    public onClientLoadWorld = new NetworkFunction<[worldId: number], [positionData: Vector3[], objectData: WorldObjectPlacementData[]]>("WorldManager.onClientLoadWorld");

    public activeWorlds = new Map<number, GameObject>();

    public worlds: GameObject[];
    public worldSpacing: number = 1000;
    public maxWorlds: number = 8;

    public ghostMaterial: Material;
    public selectionObject: GameObject;
    public yellowSelectionMaterial: Material;
    public redSelectionMaterial: Material;
    public blackSelectionMaterial: Material;

    protected Awake(): void {
        if ($CLIENT) this.AwakeClient();
        if ($SERVER) {
            Airship.Chat.RegisterCommand(new SetDefaultWorldCommand());
            this.onClientLoadWorld.server.SetCallback((player, worldId) => {
                const playerWorld = this.GetWorldComponent(WorldType.PlayerWorld, worldId);
                playerWorld.state.UpdateKey("visitorIds", (ids) => {
					if (!ids.includes(player.userId)) ids.push(player.userId);
					return ids;
				});
                return [playerWorld.objects.keys(), playerWorld.objects.values()];
            })
        }
    }

    @Client()
    public AwakeClient(): void {
        this.onRequestClientRaycast.client.SetCallback((mode) => {
            const interactiveVoxelWorld = this.TryGetPlayerActiveWorldComponent(WorldType.InteractiveWorld, Game.localPlayer);
            if (interactiveVoxelWorld) {
                const data = interactiveVoxelWorld.RaycastBlock(mode);
                if (data) return [data];
            }
            return [undefined];
        })
    }

    /**
     * Get specific world component of the active world if its that type.
     */
    public GetWorldComponent<T extends WorldType>(worldType: T, worldId: number): WorldFromEnum<T> {
        return this.TryGetWorldComponent<T>(worldType, worldId)!;
    }

    /**
     * Tries to get specific world component of the active world if its that type.
     */
    public TryGetWorldComponent<T extends WorldType>(worldType: T, worldId: number): WorldFromEnum<T> | undefined {
        if (worldType === WorldType.BaseWorld) return this.activeWorlds.get(worldId)?.GetAirshipComponent<World>() as WorldFromEnum<T> | undefined;
        if (worldType === WorldType.PlayerWorld) return this.activeWorlds.get(worldId)?.GetAirshipComponent<PlayerWorld>() as WorldFromEnum<T> | undefined;
        if (worldType === WorldType.InteractiveWorld) return this.activeWorlds.get(worldId)?.GetAirshipComponent<InteractiveWorld>() as WorldFromEnum<T> | undefined;
    }

    /**
     * Gets a component from the world that the player is at.
     */
    public GetPlayerActiveWorldComponent<T extends WorldType>(worldType: T, player: Player): WorldFromEnum<T> {
        return this.TryGetPlayerActiveWorldComponent<T>(worldType, player)!;
    }

    /**
     * Tries to get a component from the world that the player is at.
     */
    public TryGetPlayerActiveWorldComponent<T extends WorldType>(worldType: T, player: Player): WorldFromEnum<T> | undefined {
        const worldId = PlayerDataManager.Get().GetPlayerState(player)?.state.GetKey("worldId");
        if (!worldId) return;
        return this.TryGetWorldComponent<T>(worldType, worldId);
    }

    /**
     * Loads a world on the client with a given name.
     */
    @Client()
	public ClientLoadWorld(worldName: string, netId: number): void {
        Logger.Get().DebugPrint(`Loading world '${worldName}'`);
        const worldGameObject = NetworkUtil.WaitForNetworkIdentityTimeout(netId, 10)?.gameObject;
        if (!worldGameObject) {
            Logger.Get().Warn("Failed to load world from network.");
            Game.localPlayer.Kick("Failed to load world from network.");
            return;
        }
        worldGameObject.name = worldName;
        this.activeWorlds.set(netId, worldGameObject);
        const worldComponent = this.GetWorldComponent(WorldType.BaseWorld, netId);
        worldComponent.worldId = netId;
        const interactiveWorldComponent = this.TryGetWorldComponent(WorldType.InteractiveWorld, netId);
        if (interactiveWorldComponent) {
            const [positionData, objectData] = this.onClientLoadWorld.client.FireServer(netId);
            
            positionData.forEach((position, index) => interactiveWorldComponent.ClientAddBlock(position, objectData[index]));
        }
		this.onWorldLoadFinished.Fire(worldName);
    }

    @Server()
    public GetNextWorldPosition(): Vector3 | undefined {
        let position = Vector3.zero;
        let tries = 0;
        let success = false;
        while (tries < this.maxWorlds) {
            const world = this.activeWorlds.values().find((worldGameObject) => worldGameObject.GetAirshipComponent<World>()!.position === position);
            if (!world) {
                success = true;
                break;
            }
            position = position.add(new Vector3(this.worldSpacing, 0, 0));
            tries++;
        }
        return success ? position : undefined;
    }

    /**
     * Creates a world for a player.
     * @param player The player that will own the world if its a player world.
     * @param worldName The name of the world to create.
     * @returns The created world.
     */
    @Server()
    public CreateWorld(player: Player, worldName: string): World | undefined {
        const position = this.GetNextWorldPosition();
        if (!position) return;
        const worldGameObject = Object.Instantiate<GameObject>(Asset.LoadAsset("Assets/Resources/Worlds/" + worldName + ".prefab"), this.gameObject.transform);
        const world = worldGameObject.GetAirshipComponent<World>()!;
        world.position = position;
        worldGameObject.transform.position = world.position;
        NetworkServer.Spawn(worldGameObject);
        worldGameObject.name = worldName;
        const worldId = world.gameObject.GetComponent<NetworkIdentity>()!.netId;
        this.activeWorlds.set(worldId, worldGameObject);
        const playerWorld = worldGameObject.GetAirshipComponent<PlayerWorld>();
        if (playerWorld) {
            playerWorld.LoadWorld(player, worldId);
        }
        world.worldId = worldId;
        return world;
    }

    /**
     * Gets a world or spawns one for a player.
     * @returns the world the player was added to.
     */
    @Server()
	public ServerLoadWorld(player: Player, worldName: string): World | undefined {
        Logger.Get().DebugPrint(`Loading world '${worldName}'`);
        let world = this.activeWorlds.values().map(worldGameObject => worldGameObject.GetAirshipComponent<World>()!).find((world) => {
            if (world.worldName !== worldName) return false;
            if (world.worldServerType === WorldServerType.PerPlayer) return false;
            return true;
        });
        if (!world) world = this.CreateWorld(player, worldName);
        return world;
	}

    @Server()
    public UnloadPlayerWorld(player: Player): void {
        this.activeWorlds.forEach((worldGameObject, worldId) => {
            const playerWorld = this.GetWorldComponent(WorldType.PlayerWorld, worldId);
            if (playerWorld.GetOwner() !== player) return;
            this.activeWorlds.delete(worldId);
            Destroy(worldGameObject);
        });
    }

    @Server()
    public RequestClientRaycast(player: Player, mode: "Place" | "Select"): RaycastData | undefined {
        return this.onRequestClientRaycast.server.FireClient(player, mode)[0];
    }
}