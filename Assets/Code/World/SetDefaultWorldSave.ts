import { Airship, Platform } from "@Easy/Core/Shared/Airship";
import { ChatCommand } from "@Easy/Core/Shared/Commands/ChatCommand";
import { Player } from "@Easy/Core/Shared/Player/Player";
import WorldManager from "./WorldManager";
import { WorldType } from "./World";

export class SetDefaultWorldCommand extends ChatCommand {
	constructor() {
		// command name, alias, usage hints, and description
		super("set-default-world", [], "", "sets the default world for the world the player is at", true);
	}

	// Player that sent the command and the variables passed through as string arguments
	public Execute(player: Player): void {
        const world = WorldManager.Get().GetPlayerActiveWorldComponent(WorldType.PlayerWorld, player);
		if (!world) Airship.Chat.BroadcastMessage(`Invalid world! Must be at a player world!`);
		const save = world.SaveWorld();
		save.owner = "";
		print("Save:");
		print(save);
		Platform.Server.DataStore.SetKey(`DEFAULT_WORLD:${world.worldName}`, save).await();

		Airship.Chat.BroadcastMessage(`Set global default save!`);
	}
}