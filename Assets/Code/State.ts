import { NetworkFunction } from "@Easy/Core/Shared/Network/NetworkFunction";
import { NetworkSignal } from "@Easy/Core/Shared/Network/NetworkSignal";
import { Player } from "@Easy/Core/Shared/Player/Player";
import { Bin } from "@Easy/Core/Shared/Util/Bin";
import ObjectUtils from "@Easy/Core/Shared/Util/ObjectUtils";
import { Signal, SignalPriority } from "@Easy/Core/Shared/Util/Signal";
import Logger from "./Logger";

export interface BaseState {
    [key: string]: defined,
}
export default abstract class State<ClientState extends BaseState = BaseState, ServerState extends BaseState = BaseState> {
    public static readonly states = new Map<string, State>();
    private static readonly clientConnectStateNetFunc = new NetworkFunction<[name: string, id: string], [state: object | undefined]>("State.clientConnectState");
    private static readonly clientDisconnectStateNetSignal = new NetworkSignal<[name: string, id: string]>("State.clientDisconnectState");
    private static readonly updateClientStateNetSignal = new NetworkSignal<[name: string, id: string, key: string, value: defined]>("State.updateClientState");
    private static readonly destroyClientStateNetSignal = new NetworkSignal<[name: string, id: string]>("State.destroyClientState");
    
    public readonly abstract name: string;
    public stateId: string;
    
    public defaultClientState: ClientState;
    public defaultServerState: ServerState;

    public readonly onStateUpdated = new Signal<[key: keyof (ClientState | ServerState), value: defined, oldValue: defined]>();

    private readonly bin = new Bin();

    // Client use only
    private clientState: ClientState;

    // Server use only
    private serverState: ServerState;
    private clients: Player[] = [];
    private syncedKeys: string[] = [];
    
    public static StartEvents(): void {
        if ($SERVER) {
            State.clientConnectStateNetFunc.server.SetCallback((player, name, id) => {
                const state = this.states.get(`${name}:${id}`);
                if (!state) {
                    Logger.Get().Warn(`Client tries to connect to an invalid state: '${name}:${id}'`);
                    return undefined;
                }
                state.clients.push(player);
                return state.GetClientStateServer();
            });

            State.clientDisconnectStateNetSignal.server.OnClientEvent((player, name, id) => {
                const state = this.states.get(`${name}:${id}`);
                if (!state) return;
                state.clients.remove(state.clients.indexOf(player));
            });
        }
        if ($CLIENT) {
            State.updateClientStateNetSignal.client.OnServerEvent((name, id, key, value) => {
                const state = this.states.get(`${name}:${id}`);
                if (!state) return;
                const oldValue = typeIs(state.clientState[key], 'table') ? ObjectUtils.deepCopy(state.clientState[key]) : state.clientState[key];
                state.clientState[key] = value;
                state.onStateUpdated.Fire(key, value, oldValue);
            });
            State.destroyClientStateNetSignal.client.OnServerEvent((name, id) => {
                const state = this.states.get(`${name}:${id}`);
                if (!state) return;
                state.Destroy();
            });
        }
    }

    public InitializeState(stateId: string, defaultClientState?: ClientState, defaultServerState?: ServerState): void {
        this.stateId = stateId;
        if (defaultClientState) this.defaultClientState = defaultClientState;
        if (defaultServerState) this.defaultServerState = defaultServerState;
        if (!this.defaultClientState) Logger.Get().Error(`Missing Default Client State In State Constructor!`);
        if (!this.defaultServerState) Logger.Get().Error(`Missing Default Server State In State Constructor!`);
        
        if ($SERVER) {
            this.syncedKeys = this.GetClientSyncedKeys();
            this.serverState = this.defaultServerState;
            this.bin.Add(this.onStateUpdated.ConnectWithPriority(SignalPriority.HIGHEST, (key, value) => {
                if (this.syncedKeys.includes(key as string)) State.updateClientStateNetSignal.server.FireClients(this.clients, this.name, this.stateId, key as string, value);
            }));
        }
        if ($CLIENT) {
            this.clientState = State.clientConnectStateNetFunc.client.FireServer(this.name, this.stateId) as ClientState;
        }
        State.states.set(`${this.name}:${this.stateId}`, this as unknown as State);
    }

    public Destroy(): void {
        State.states.delete(`${this.name}:${this.stateId}`);
        if ($SERVER) State.destroyClientStateNetSignal.server.FireAllClients(this.name, this.stateId);
        this.bin.Clean();
    }

    /**
     * Gets all keys shared between server and client states.
     */
    public GetClientSyncedKeys(): string[] {
        if ($CLIENT) throw Logger.Get().Error("Cannot get client synced keys on client!");
        const keys: string[] = [];
        (ObjectUtils.keys(this.defaultServerState) as string[]).forEach((key) => {
            if (!(key in this.defaultClientState)) return;
            keys.push(key);
        });
        return keys;
    }

    /**
     * Gets the full initial clients state with current server state data.
     */
    public GetClientStateServer(): ClientState {
        const obj = {} as ClientState;
        (ObjectUtils.keys(this.defaultClientState) as string[]).forEach((key) => {
            if (this.syncedKeys.includes(key)) {
                obj[key as keyof ClientState] = this.serverState[key as keyof ServerState] as unknown as ClientState[keyof ClientState];
            } else {
                obj[key as keyof ClientState] = this.defaultClientState[key as keyof ClientState];
            }
        });
        return obj;
    }

    public ConnectKeyUpdated<K extends keyof (ClientState | ServerState)>(key: K, func: (value: (ClientState | ServerState)[K], oldValue: (ClientState | ServerState)[K]) => void, priority: SignalPriority = SignalPriority.NORMAL): (() => void) | undefined {
        if (!((($CLIENT ? ObjectUtils.keys(this.clientState) : ObjectUtils.keys(this.serverState)) as string[]).includes(key as string))) return;
        const disconnectFunc = this.onStateUpdated.ConnectWithPriority(priority, (updatedKey, value, oldValue) => {
            if (key !== updatedKey) return;
            func(value as (ClientState | ServerState)[K], oldValue as (ClientState | ServerState)[K]);
        })
        this.bin.Add(disconnectFunc);
        return disconnectFunc;
    }

    public OnceKeyUpdated<K extends keyof (ClientState | ServerState)>(key: K, func: (value: (ClientState | ServerState)[K], oldValue: (ClientState | ServerState)[K]) => void, priority: SignalPriority = SignalPriority.NORMAL): (() => void) | undefined {
        if (!((($CLIENT ? ObjectUtils.keys(this.clientState) : ObjectUtils.keys(this.serverState)) as string[]).includes(key as string))) return;
        const disconnectFunc = this.onStateUpdated.ConnectWithPriority(priority, (updatedKey, value, oldValue) => {
            if (key !== updatedKey) return;
            func(value as (ClientState | ServerState)[K], oldValue as (ClientState | ServerState)[K]);
            disconnectFunc();
        })
        this.bin.Add(disconnectFunc);
        return disconnectFunc;
    }

    public SetKey<K extends keyof (ClientState | ServerState)>(key: K, value: (ClientState | ServerState)[K]): void {
        const oldValue = typeIs(($CLIENT ? this.clientState : this.serverState)[key], 'table') ? ObjectUtils.deepCopy(($CLIENT ? this.clientState : this.serverState)[key]) : ($CLIENT ? this.clientState : this.serverState)[key];
        if (json.encode(oldValue) === json.encode(value)) return;
        if ($CLIENT) this.clientState[key] = value as ClientState[K];
        if ($SERVER) this.serverState[key] = value as ServerState[K];
        this.onStateUpdated.Fire(key as keyof (ClientState | ServerState), value, oldValue);
    }

    public UpdateKey<K extends keyof (ClientState | ServerState)>(key: K, func: (value: (ClientState | ServerState)[K]) => (ClientState | ServerState)[K]): void {
        const oldValue = typeIs(($CLIENT ? this.clientState : this.serverState)[key], 'table') ? ObjectUtils.deepCopy(($CLIENT ? this.clientState : this.serverState)[key]) : ($CLIENT ? this.clientState : this.serverState)[key];
        const value = func(($CLIENT ? this.clientState : this.serverState)[key]);
        if (json.encode(oldValue) === json.encode(value)) return;
        if ($CLIENT) this.clientState[key] = value as ClientState[K];
        if ($SERVER) this.serverState[key] = value as ServerState[K];
        this.onStateUpdated.Fire(key as keyof (ClientState | ServerState), value, oldValue);
    }

    public GetKey<K extends keyof (ClientState | ServerState)>(key: K): (ClientState | ServerState)[K] {
        return ($CLIENT ? this.clientState : this.serverState)[key];
    }

    public GetState(): ClientState | ServerState {
        return $CLIENT ? this.clientState : this.serverState;
    }
}