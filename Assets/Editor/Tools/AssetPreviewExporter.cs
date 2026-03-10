#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;
using System.IO;
using UnityEditor.Presets;

public class AssetPreviewExporter
{
    [MenuItem("Tools/Generate Asset Previews")]
    public static void GeneratePreviews()
    {
        Object[] selection = Selection.objects;

        if (selection.Length == 0)
        {
            Debug.LogWarning("No assets selected.");
            return;
        }

        foreach (Object asset in selection)
        {
            EditorApplication.delayCall += () =>
            {
                GeneratePreview(asset);
            };
        }
    }

    private static void ApplyImportPreset(string assetPath)
    {
        AssetImporter importer = AssetImporter.GetAtPath(assetPath);
        if (importer == null) return;

        Preset preset = AssetDatabase.LoadAssetAtPath<Preset>(
            "Assets/Raynbo Games/Presets/GeneratedIconImporter.preset"
        );

        if (preset == null)
        {
            Debug.LogError("Preset not found!");
            return;
        }

        preset.ApplyTo(importer);
        importer.SaveAndReimport();
    }


    private static void GeneratePreview(Object asset)
    {
        Texture2D preview = AssetPreview.GetAssetPreview(asset);

        if (preview == null)
        {
            EditorApplication.delayCall += () => GeneratePreview(asset);
            return;
        }

        Texture2D clean = RemoveGrayBackground(preview);

        string assetPath = AssetDatabase.GetAssetPath(asset);
        string folderPath = Path.GetDirectoryName(assetPath);
        string safeName = asset.name.Replace(" ", "");

        string outputPath = Path.Combine(folderPath, safeName + "Icon.png");

        File.WriteAllBytes(outputPath, clean.EncodeToPNG());
        AssetDatabase.ImportAsset(outputPath);

        ApplyImportPreset(outputPath);

        Debug.Log($"Saved preview: {outputPath}");
    }

    private static Texture2D RemoveGrayBackground(Texture2D source)
    {
        Texture2D tex = new Texture2D(
            source.width,
            source.height,
            TextureFormat.RGBA32,
            false
        );

        Color[] pixels = source.GetPixels();
        Color bg = pixels[0]; // top-left pixel = background

        for (int i = 0; i < pixels.Length; i++)
        {
            if (IsSimilar(pixels[i], bg))
                pixels[i].a = 0f;
        }

        tex.SetPixels(pixels);
        tex.Apply();
        return tex;
    }

    private static bool IsSimilar(Color a, Color b, float tolerance = 0.001f)
    {
        return Mathf.Abs(a.r - b.r) < tolerance &&
               Mathf.Abs(a.g - b.g) < tolerance &&
               Mathf.Abs(a.b - b.b) < tolerance;
    }
}
#endif
