using UnityEngine;

namespace NeonVoid.Data
{
    /// <summary>
    /// Oyundaki 4 temel düşman sınıfı.
    /// </summary>
    public enum EnemyCategory
    {
        Swarm,  // Hızlı, düşük can, kalabalık gruplar halinde gelen siborg böcekler
        Tank,   // Yavaş, çok yüksek can ve yüksek fiziksel/enerji zırhına sahip mekanik tanklar
        Flying, // Yalnızca hava hedeflerini vurabilen kulelerin (Rapid Laser, Sniper vb.) hedefleyebildiği neon dronlar
        Boss    // Her 10 bölümde bir gelen, devasa cana ve kule dondurma (EMP Pulse) yeteneğine sahip dev mekanikler
    }

    /// <summary>
    /// Düşman birimlerinin taban istatistiklerini ve Boss yetenek parametrelerini tutan ScriptableObject.
    /// Bölüm ilerledikçe bu taban değerler DifficultyCalculator tarafından logaritmik eğriyle ölçeklenir.
    /// </summary>
    [CreateAssetMenu(fileName = "SO_Enemy_New", menuName = "NeonVoid/Data/Enemy Data", order = 2)]
    public class EnemyDataSO : ScriptableObject
    {
        [Header("Kimlik ve Görsel")]
        public string EnemyID;
        public string EnemyName;
        public EnemyCategory Category;
        public GameObject EnemyPrefab;
        [ColorUsage(true, true)]
        [Tooltip("Düşmanın neon damar/çekirdek rengi (URP Bloom ile parlar).")]
        public Color NeonCoreColor = Color.magenta;
        public GameObject DeathExplosionVFXPrefab;

        [Header("Taban Savaş İstatistikleri (1. Bölüm Baz Değerleri)")]
        [Tooltip("1. bölümdeki taban can değeri. DifficultyCalculator ile bölüm başına ölçeklenir.")]
        public float BaseMaxHealth = 100f;

        [Tooltip("1. bölümdeki taban zırh değeri (0.0 = %0 hasar azaltma, 0.75 = %75 hasar azaltma).")]
        [Range(0f, 0.85f)]
        public float BaseArmorRatio = 0.1f;

        [Tooltip("Waypoint yolu üzerindeki hareket hızı (Unity birimi / saniye).")]
        public float MoveSpeed = 3.5f;

        [Tooltip("Düşman yolun sonundaki üsse (Cyber-Nexus) ulaştığında üsse vereceği can hasarı.")]
        public int BaseNexusDamage = 1;

        [Header("Ödül ve Ekonomi")]
        [Tooltip("Düşman yok edildiğinde oyuncuya verilen oyun içi altın (Kule kurma/geliştirme için).")]
        public int GoldReward = 15;

        [Tooltip("Düşman yok edildiğinde bölüm sonu havuzuna eklenen standart meta para (Gear) katkısı.")]
        public int GearDropAmount = 2;

        [Header("Dalga (Wave) Üretim Ağırlıkları")]
        [Tooltip("Bu düşmanın kaçıncı bölümden itibaren dalgalarda çıkabileceği.")]
        [Range(1, 100)]
        public int MinUnlockLevel = 1;

        [Tooltip("Bir dalga bütçesinde bu düşmanın kapladığı tehdit maliyeti (Swarm=1, Flying=2, Tank=4, Boss=25).")]
        public int ThreatCost = 1;

        [Header("Boss Özel Yetenek Ayarları (Sadece Category == Boss ise aktif)")]
        [Tooltip("Boss'un etrafındaki kuleleri donduran siber şok dalgasını kaç saniyede bir ateşleyeceği.")]
        public float BossFreezePulseInterval = 8f;

        [Tooltip("Boss'un kule dondurma yeteneğinin etki yarıçapı.")]
        public float BossFreezeRadius = 6.5f;

        [Tooltip("Etkilenen kulelerin kaç saniye boyunca devre dışı (Stun/Frozen) kalacağı.")]
        public float BossTowerFreezeDuration = 3.0f;

        public bool IsFlying => Category == EnemyCategory.Flying;
        public bool IsBoss => Category == EnemyCategory.Boss;
    }
}