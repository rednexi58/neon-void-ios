using System;
using UnityEngine;

namespace NeonVoid.Gameplay.Spawner
{
    /// <summary>
    /// Belirli bir bölüm ve dalga için hesaplanan düşman ölçekleme çarpanlarını taşır.
    /// </summary>
    [Serializable]
    public struct LevelDifficultySnapshot
    {
        public int LevelNumber;
        public int TotalWavesInLevel;
        public bool IsBossLevel;
        public float HealthMultiplier;
        public float ArmorBonus;
        public int WaveThreatBudget;
        public int CompletionGearReward;
        public int CompletionCyberCoreReward;
    }

    /// <summary>
    /// 1'den 100'e kadar olan bölümlerin dalga sayılarını, düşman can/zırh çarpanlarını ve
    /// bölüm sonu ödüllerini logaritmik + kontrollü polinom eğrisiyle hesaplayan matematiksel motor.
    /// </summary>
    public static class DifficultyCalculator
    {
        public const int MaxCampaignLevels = 100;
        public const int BossLevelInterval = 10;

        /// <summary>
        /// Belirtilen bölüm (1..100) ve dalga indeksi için tüm zorluk verilerini hesaplar.
        /// </summary>
        /// <param name="level">Mevcut bölüm numarası (1 - 100)</param>
        /// <param name="waveIndex">Mevcut dalga indeksi (0 tabanlı)</param>
        public static LevelDifficultySnapshot CalculateDifficulty(int level, int waveIndex = 0)
        {
            int clampedLevel = Mathf.Clamp(level, 1, MaxCampaignLevels);
            bool isBossLevel = (clampedLevel % BossLevelInterval == 0);

            int totalWaves = CalculateWaveCount(clampedLevel, isBossLevel);
            float healthMultiplier = CalculateHealthMultiplier(clampedLevel, waveIndex);
            float armorBonus = CalculateArmorBonus(clampedLevel);
            int threatBudget = CalculateWaveThreatBudget(clampedLevel, waveIndex, totalWaves);

            // Bölüm sonu meta-para ödülleri (Gear ve Cyber-Core)
            int gearReward = Mathf.RoundToInt(50f + (clampedLevel * 18f) + (Mathf.Log(clampedLevel + 1f, 2f) * 35f));
            int cyberCoreReward = isBossLevel ? (15 + (clampedLevel / 10) * 5) : (clampedLevel % 5 == 0 ? 5 : 2);

            return new LevelDifficultySnapshot
            {
                LevelNumber = clampedLevel,
                TotalWavesInLevel = totalWaves,
                IsBossLevel = isBossLevel,
                HealthMultiplier = healthMultiplier,
                ArmorBonus = armorBonus,
                WaveThreatBudget = threatBudget,
                CompletionGearReward = gearReward,
                CompletionCyberCoreReward = cyberCoreReward
            };
        }

        /// <summary>
        /// Bölümdeki toplam dalga (Wave) sayısını logaritmik eğri ile belirler.
        /// Bölüm 1: 3 Dalga -> Bölüm 50: ~9 Dalga -> Bölüm 100: 12 Dalga.
        /// Boss bölümlerinde (10, 20, ..., 100) son dalga için +1 ekstra dalga eklenir.
        /// </summary>
        public static int CalculateWaveCount(int level, bool isBossLevel)
        {
            // Formül: W(L) = Floor(3 + 1.85 * ln(L))
            int baseWaves = Mathf.FloorToInt(3f + 1.85f * Mathf.Log(level));
            if (isBossLevel)
            {
                baseWaves += 1;
            }
            return Mathf.Clamp(baseWaves, 3, 14);
        }

        /// <summary>
        /// Düşmanların Can (HP) çarpanını hesaplar.
        /// Erken bölümlerde yumuşak bir logaritmik geçiş, ileri bölümlerde (Araştırma Laboratuvarı
        /// güçlendirmelerini dengelemek için) hibrit bir büyüme sağlar.
        /// </summary>
        public static float CalculateHealthMultiplier(int level, int waveIndex)
        {
            if (level <= 1 && waveIndex == 0)
                return 1.0f;

            // Logaritmik bileşen: Erken-orta oyunda adil bir artış sağlar
            float logTerm = 1.45f * Mathf.Log(level + 1f, 2f);

            // Polinom bileşen: 40. bölümden sonra oyuncunun kule/Skill Tree gelişimini dengeler
            float polyTerm = 0.042f * Mathf.Pow(level - 1, 1.38f);

            // Dalga içi mikro artış: Aynı bölümün son dalgaları ilk dalgasından %8-%40 daha dirençlidir
            float intraWaveFactor = 1.0f + (waveIndex * 0.06f);

            float rawMultiplier = (0.35f + logTerm + polyTerm) * intraWaveFactor;
            return Mathf.Max(1.0f, (float)Math.Round(rawMultiplier, 2));
        }

        /// <summary>
        /// Düşmanların taban zırhına (BaseArmorRatio) eklenecek logaritmik zırh bonusunu hesaplar.
        /// Maksimum +0.35 (%35 ek zırh) ile sınırlandırılır ki Sniper Railgun ve Plasma Cannon'un önemi artsın.
        /// </summary>
        public static float CalculateArmorBonus(int level)
        {
            if (level <= 1) return 0f;

            // L=100'de yaklaşık +0.32 bonus verir
            float bonus = 0.048f * Mathf.Log(level, 2f);
            return Mathf.Clamp(bonus, 0f, 0.35f);
        }

        /// <summary>
        /// Bir dalgada doğacak toplam düşman tehdit bütçesini (Threat Budget) hesaplar.
        /// WaveSpawner bu bütçeyi harcayarak Swarm, Flying ve Tank birimleri üretir.
        /// </summary>
        public static int CalculateWaveThreatBudget(int level, int waveIndex, int totalWaves)
        {
            float baseBudget = 8f + (level * 2.4f) + (6f * Mathf.Log(level + 1f));
            float waveProgressRatio = totalWaves > 1 ? (float)waveIndex / (totalWaves - 1) : 0f;

            // Bölümün ilk dalgası ısınma turlarıdır (x0.85), final dalgası zirvedir (x1.55)
            float wavePacingMultiplier = Mathf.Lerp(0.85f, 1.55f, waveProgressRatio);

            return Mathf.Max(6, Mathf.RoundToInt(baseBudget * wavePacingMultiplier));
        }

        /// <summary>
        /// Kule hasarından düşman zırhını ve kulenin zırh delme (Armor Penetration) oranını düşerek
        /// net uygulanacak hasarı hesaplar.
        /// </summary>
        public static float ComputeFinalDamage(float rawDamage, float enemyArmorRatio, float towerArmorPenetration)
        {
            float effectiveArmor = Mathf.Clamp(enemyArmorRatio * (1f - Mathf.Clamp01(towerArmorPenetration)), 0f, 0.90f);
            return rawDamage * (1f - effectiveArmor);
        }
    }
}