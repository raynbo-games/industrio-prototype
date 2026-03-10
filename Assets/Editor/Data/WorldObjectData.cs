using System.Collections.Generic;
using Tayx.Graphy.Utils.NumString;
using UnityEditor;
using UnityEngine;

[CustomAirshipEditor("WorldObjectData")]
public class WorldObjectDataEditor : AirshipEditor {
    public override void OnInspectorGUI()
    {
        EditorGUILayout.LabelField("World Object Data");
        EditorGUILayout.BeginVertical(new GUIStyle("FrameBox") { padding = new RectOffset(5, 5, 5, 5), margin = new RectOffset(10, 10, 5, 5) });
        PropertyFields(
            "isSupportive", 
            "requireSupport", 
            "canRotate", 
            "canRotateNormal", 
            "voxelDefinition", 
            "components", 
            "size", 
            "origin",
            "occupancy", 
            "floorSupport",
            "view"
        );
        EditorGUILayout.EndVertical();
        Utility.RenderChildProperty(serializedObject, "audio", "Assets/Code/Data/WorldObject/WorldObjectAudioData.ts");
        Utility.RenderChildProperty(serializedObject, "animation", "Assets/Code/Data/WorldObject/WorldAnimationData.ts");
        serializedObject.ApplyModifiedProperties();
    }
}