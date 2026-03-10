import { MathUtil } from "@Easy/Core/Shared/Util/MathUtil";
import Logger from "Code/Logger";

export const WorldObjectRotationValues = {
    0: Quaternion.Euler(0, 0, 0),
    1: Quaternion.Euler(0, 90, 0),
    2: Quaternion.Euler(0, 180, 0),
    3: Quaternion.Euler(0, 270, 0),
}

export enum WorldObjectRotation {
    Front = 0,
    Right = 1,
    Back = 2,
    Left = 3,
}

export const WorldObjectNormalValues = {
    0: Quaternion.Euler(90, 0, 0),
    1: Quaternion.Euler(90, 0, 270),
    2: Quaternion.Euler(90, 0, 180),
    3: Quaternion.Euler(90, 0, 90),
    4: Quaternion.Euler(180, 0, 0),
    5: Quaternion.Euler(0, 0, 0),
}

export enum WorldObjectNormal {
    Back = 0,
    Left = 1,
    Front = 2,
    Right = 3,
    Up = 4,
    Down = 5,
}

export function GetWorldObjectNormal(normal: Vector3): WorldObjectNormal {
    normal = MathUtil.RoundVec(MathUtil.RoundVec(normal));
    switch (normal) {
        case Vector3.forward:
            return WorldObjectNormal.Front;
        case Vector3.right:
            return WorldObjectNormal.Right;
        case Vector3.back:
            return WorldObjectNormal.Back;
        case Vector3.left:
            return WorldObjectNormal.Left;
        case Vector3.up:
            return WorldObjectNormal.Up;
        case Vector3.down:
            return WorldObjectNormal.Down;
    }
    throw Logger.Get().Error(`Invalid normal ${normal}`)
}