import State from "./State";
import { Airship } from "@Easy/Core/Shared/Airship";
import { Player } from "@Easy/Core/Shared/Player/Player";
import Logger, { ReturnSuccess } from "./Logger";
import WorldManager from "./World/WorldManager";
import PlayerGUI from "./PlayerGUI/PlayerGUI";
import PlayerDataManager from "./PlayerDataManager/PlayerDataManager";
import { PlayerSaveUtility } from "./PlayerDataManager/PlayerSave";
import { WorldServerType, WorldType } from "./World/World";
import { Game } from "@Easy/Core/Shared/Game";

@AirshipComponentMenu("Singletons/Game Manager")
export default class GameManager extends AirshipSingleton {

	//#region Awake

	protected Awake(): void {
		State.StartEvents();
		if ($SERVER) this.AwakeServer()
		if ($CLIENT) this.AwakeClient();
	}

	@Client()
	public AwakeClient(): void {
		Airship.LoadingScreen.HideSkipButton();
		Airship.LoadingScreen.SetProgress("Server Loading World", 0);
		WorldManager.Get().onWorldLoadFinishedNetSignal.client.OnServerEvent((worldName, netId) => {
			Airship.LoadingScreen.SetProgress("Loading Player", 0);
			PlayerDataManager.Get().InitializeLocalPlayerStates();
			Airship.LoadingScreen.SetProgress("Client Loading World", 0.1);
			WorldManager.Get().ClientLoadWorld(worldName, netId);
			print(`World ID: ${PlayerDataManager.Get().GetLocalState().state.GetKey("worldId")}`);
			Airship.LoadingScreen.SetProgress("Server Loading Player World State", 0.3);
			const playerWorld = WorldManager.Get().GetWorldComponent(WorldType.PlayerWorld, netId);
			playerWorld?.LoadState(Game.localPlayer, playerWorld.worldId);
			Airship.LoadingScreen.SetProgress("Server Loading Player GUI", 0.4);
			PlayerGUI.Get().Initialize();
			Airship.LoadingScreen.FinishLoading();
		});
	}

	@Server()
	public AwakeServer(): void {
		Airship.Players.ObservePlayers((player) => {
			const data = this.OnPlayerJoinedServer(player);
			if (!data.success) {
				Logger.Get().Warn(`Could not load ${player.username}: '${data.value}'`);
				player.Kick(data.value!);
				return;
			}
			return () => this.OnPlayerLeftServer(player);
		});
	}

	//#endregion

	public override OnDestroy(): void {}

	//#region On Player Joined

	@Server()
	private OnPlayerJoinedServer(player: Player): ReturnSuccess {
		// Load player data
		
		const states = PlayerDataManager.Get().InitializePlayerStates(player);
		if (!states) {
			PlayerSaveUtility.CleanUp(player.userId);
			return new ReturnSuccess(false, `Failed to load player save`);
		}

		const world = WorldManager.Get().ServerLoadWorld(player, states.save.world);
		if (!world) return new ReturnSuccess(false, `Failed to create world`);
		states.state.SetKey("worldId", world.worldId);
		WorldManager.Get().onWorldLoadFinishedNetSignal.server.FireClient(player, world.worldName, world.worldId);
		task.wait(0.1); //Wait for player voxel world to load
		this.SpawnCharacter(player);
		return new ReturnSuccess(true, `Success`);
	}

	@Server()
	public SpawnCharacter(player: Player) {
		const world = WorldManager.Get().TryGetPlayerActiveWorldComponent(WorldType.BaseWorld, player);
		if (!world) return;
		if (player.character) player.character.Despawn();
		const playerWorld = WorldManager.Get().TryGetWorldComponent(WorldType.PlayerWorld, world.worldId);
		if (!playerWorld) return player.SpawnCharacter(world.position);
		let space = 0; 
		let position = playerWorld.position;
		while (space < 3) {
			if (playerWorld.occupancy.get(position)) space = 0;
			else space += 1;
			position = position.add(new Vector3(0, 1, 0));
		}
		player.SpawnCharacter(position);
	}


	//#endregion

	//#region On Player Left

	@Server()
	private OnPlayerLeftServer(player: Player): void {
		const world = WorldManager.Get().TryGetPlayerActiveWorldComponent(WorldType.BaseWorld, player);
		if (!world) return PlayerDataManager.Get().DestroyPlayerStates(player);
		if (world.worldServerType === WorldServerType.Shared) return PlayerDataManager.Get().DestroyPlayerStates(player);
		const playerWorld = WorldManager.Get().TryGetWorldComponent(WorldType.PlayerWorld, world.worldId);
		if (playerWorld && playerWorld.GetOwner() === player) {
			playerWorld.state.GetKey("visitorIds").forEach((userId) => {
				if (player.userId === userId) return;
				Airship.Players.FindByUserId(userId)?.Kick("World owner left server!")
			});
			const worldSave = playerWorld.SaveWorld();
			PlayerDataManager.Get().DestroyPlayerStates(player, worldSave);
			WorldManager.Get().UnloadPlayerWorld(player);
		} else {
			if (playerWorld) {
				playerWorld.state.UpdateKey("visitorIds", (ids) => {
					if (ids.includes(player.userId)) ids.remove(ids.indexOf(player.userId));
					return ids;
				});
			}
			PlayerDataManager.Get().DestroyPlayerStates(player);
		}
	}

	//#endregion

	protected Update(): void {
		if ($SERVER) this.UpdateServer();
	}

	@Server()
	public UpdateServer(): void {
		Airship.Players.GetPlayers().forEach((player) => {
			if (!player.character) return;
			const world = WorldManager.Get().TryGetPlayerActiveWorldComponent(WorldType.BaseWorld, player);
			if (!world) return;
			const voidHeight = world.position.y - world.size.y / 2;
			if (player.character.movement.GetPosition().y > voidHeight) return;
			this.SpawnCharacter(player);
		});
	}
}
