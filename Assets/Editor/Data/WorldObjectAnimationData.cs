using System.Collections.Generic;
using Tayx.Graphy.Utils.NumString;
using UnityEditor;
using UnityEngine;

[CustomAirshipEditor("WorldObjectAnimationData")]
public class WorldObjectAnimationDataEditor : AirshipEditor {
    public override void OnInspectorGUI()
    {
        EditorGUILayout.LabelField("World Object Animation Data");
        EditorGUILayout.BeginVertical(new GUIStyle("FrameBox") { padding = new RectOffset(5, 5, 5, 5), margin = new RectOffset(10, 10, 5, 5) });
        PropertyFields(
            "hit",
            "place",
            "break",
            "use",
            "enable",
            "enabled",
            "disable",
            "disabled"
        );
        EditorGUILayout.EndVertical();
        serializedObject.ApplyModifiedProperties();
    }
}