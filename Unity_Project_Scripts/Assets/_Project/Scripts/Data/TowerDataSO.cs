using System;
using UnityEngine;

namespace NeonVoid.Data
{
    /// <summary>
    /// Oyundaki 4 ana siberpunk kule arketipi.
    /// </summary>
    public enum TowerType
    {
        RapidLaser,     // Hızlı atış, düşük hasar, tek hedef (Kara + Hava hedefleri)
        PlasmaCannon,   // Yavaş atış, yüksek alan hasarı / AoE (Sadece Kara hedefleri)
        EMPBlaster,     // Hasarsız veya çok düşük hasarlı, yavaşlatma ve dondurma etkili
        SniperRailgun   // Çok uzun menzil, yüksek tekil hasar, ağır zırh delicilik (% Armor Penetration)
    }

    /// <summary>
    /// Kulenin hangi hareket düzlemindeki düşmanları hedefleyebileceğini belirler.
    /// </summary>
    [Flags]
    public enum TargetLayerMask
    {
        None = 0,
        Ground = 1 << 0,
        Flying = 1 << 1,
        Both = Ground | Flying
    }

    /// <summary>
    /// Kulelerin oyun içi altınla (Gold) yükseltilen 3 seviyesinin (Level 1, 2, 3) istatistiklerini tutar.
    /// </summary>
    [Serializable]
    public struct TowerLevelStats
    {
        [Tooltip("Kulenin bu seviyeye kurulması veya yükseltilmesi için gereken oyun içi altın maliyeti.")]
        public int GoldCost;

        [Tooltip("Kulenin satışında oyuncuya iade edilecek altın miktarı.")]
        public int SellRefundGold;

        [Tooltip("Atış başına taban hasar (EMP Blaster için 0 bırakılabilir).")]
        public float BaseDamage;

        [Tooltip("Saniyedeki atış sayısı (Attacks Per Second).")]
        public float FireRate;

        [Tooltip("Kulenin hedef algılama menzili (Unity birimi).")]
        public float Range;

        [Header("Özel Mekanik Parametreleri")]
        [Tooltip("Plasma Cannon için patlama yarıçapı (0 ise tek hedeflidir).")]
        public float SplashRadius;

        [Tooltip("Sniper Railgun için hedef zırhını yok sayma oranı (0.0 = %0, 1.0 = %100 Zırh Delme).")]
        [Range(0f, 1f)]
        public float ArmorPenetration;

        [Tooltip("EMP Blaster için hedefi yavaşlatma oranı (0.0 = Yavaşlatmaz, 0.65 = %65 Yavaşlatır).")]
        [Range(0f, 0.9f)]
        public float SlowPercentage;

        [Tooltip("EMP yavaşlatma veya dondurma etkisinin süresi (saniye).")]
        public float DebuffDuration;

        [Tooltip("Bu seviyeye özel kule prefab/mesh varyantı (Neon parlaklık ve namlu artışı için).")]
        public GameObject LevelVisualPrefab;
    }

    /// <summary>
    /// Kulelerin tüm sabit verilerini ve 3 seviyeli gelişim tablolarını barındıran ScriptableObject.
    /// Unity Editöründe: Sağ Tık -> Create -> NeonVoid -> Data -> Tower Data ile oluşturulur.
    /// </summary>
    [CreateAssetMenu(fileName = "SO_Tower_New", menuName = "NeonVoid/Data/Tower Data", order = 1)]
    public class TowerDataSO : ScriptableObject
    {
        [Header("Kimlik Bilgileri")]
        public string TowerID;
        public string DisplayName;
        [TextArea(2, 4)]
        public string Description;
        public TowerType Type;
        public Sprite Icon;

        [Header("Hedefleme ve Görsel Efektler")]
        public TargetLayerMask TargetableLayers = TargetLayerMask.Both;
        public GameObject ProjectilePrefab;
        public GameObject MuzzleFlashVFXPrefab;
        public GameObject ImpactVFXPrefab;
        [ColorUsage(true, true)]
        [Tooltip("URP Bloom ile parlayacak HDR Neon rengi.")]
        public Color NeonAccentColor = Color.cyan;

        [Header("Oyun İçi 3 Seviyeli Upgrade Tablosu (Index 0 = Lv.1, Index 1 = Lv.2, Index 2 = Lv.3)")]
        [SerializeField]
        private TowerLevelStats[] levelStats = new TowerLevelStats[3];

        public int MaxUpgradeLevel => levelStats != null ? levelStats.Length : 0;

        /// <summary>
        /// Belirtilen kule seviyesinin (1, 2 veya 3) ham istatistiklerini döndürür.
        /// </summary>
        public TowerLevelStats GetStatsForLevel(int level)
        {
            if (levelStats == null || levelStats.Length == 0)
            {
                Debug.LogError($"[TowerDataSO] {name} için seviye istatistikleri tanımlanmamış!");
                return default;
            }

            int clampedIndex = Mathf.Clamp(level - 1, 0, levelStats.Length - 1);
            return levelStats[clampedIndex];
        }

        /// <summary>
        /// Ana menüdeki Araştırma Laboratuvarı (Skill Tree) çarpanlarını uygulayarak nihai hasarı hesaplar.
        /// </summary>
        /// <param name="level">Oyun içi kule seviyesi (1-3)</param>
        /// <param name="researchDamageMultiplier">Skill Tree'den gelen kalıcı hasar çarpanı (Örn: 1.25f = +%25)</param>
        public float GetEffectiveDamage(int level, float researchDamageMultiplier = 1f)
        {
            TowerLevelStats stats = GetStatsForLevel(level);
            return stats.BaseDamage * Mathf.Max(1f, researchDamageMultiplier);
        }

        /// <summary>
        /// Ana menüdeki Araştırma Laboratuvarı (Skill Tree) çarpanlarını uygulayarak nihai atış hızını hesaplar.
        /// </summary>
        /// <param name="level">Oyun içi kule seviyesi (1-3)</param>
        /// <param name="researchFireRateMultiplier">Skill Tree'den gelen kalıcı atış hızı çarpanı</param>
        public float GetEffectiveFireRate(int level, float researchFireRateMultiplier = 1f)
        {
            TowerLevelStats stats = GetStatsForLevel(level);
            return stats.FireRate * Mathf.Max(1f, researchFireRateMultiplier);
        }

        private void OnValidate()
        {
            // Her kulenin tam 3 seviyeye sahip olmasını Editör aşamasında garanti altına alır
            if (levelStats != null && levelStats.Length != 3)
            {
                Array.Resize(ref levelStats, 3);
            }
        }
    }
}