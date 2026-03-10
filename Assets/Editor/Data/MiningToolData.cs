using System.Collections.Generic;
using Tayx.Graphy.Utils.NumString;
using UnityEditor;
using UnityEngine;

[CustomAirshipEditor("MiningToolData")]
public class MiningToolDataEditor : AirshipEditor {
    public override void OnInspectorGUI()
    {
        EditorGUILayout.LabelField("Mining Tool Data");
        EditorGUILayout.BeginVertical(new GUIStyle("FrameBox") { padding = new RectOffset(5, 5, 5, 5), margin = new RectOffset(10, 10, 5, 5) });
        PropertyFields("type", "damage", "swingSpeed", "swingAnimation", "swingSound");
        EditorGUILayout.EndVertical();
        serializedObject.ApplyModifiedProperties();
    }
}