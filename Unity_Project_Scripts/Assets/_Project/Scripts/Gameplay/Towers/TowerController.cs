using UnityEngine;
using NeonVoid.Core;
using NeonVoid.Data;
using NeonVoid.Gameplay.Enemies;
using NeonVoid.Gameplay.Spawner;

namespace NeonVoid.Gameplay.Towers
{
    /// <summary>
    /// 4 kule tipinin (Rapid Laser, Plasma Cannon, EMP Blaster, Sniper Railgun) hedef bulma,
    /// ateşleme, 3 seviyeli oyun içi yükseltme (Upgrade) ve Boss EMP dondurulma durumlarını yönetir.
    /// </summary>
    public class TowerController : MonoBehaviour
    {
        [Header("Kule Verisi ve Dönüş Parçaları")]
        [SerializeField] private TowerDataSO towerData;
        [SerializeField] private Transform turretHead;
        [SerializeField] private Transform firePoint;
        [SerializeField] private WaveSpawner waveSpawnerRef;

        [Header("Görsel Efektler")]
        [SerializeField] private LineRenderer laserBeamRenderer;
        [SerializeField] private ParticleSystem empFrozenVFX;

        private int currentUpgradeLevel = 1;
        private float fireCooldownTimer = 0f;
        private float frozenByBossTimer = 0f;
        private EnemyController currentTarget;

        public TowerDataSO Data => towerData;
        public int CurrentUpgradeLevel => currentUpgradeLevel;
        public bool IsFrozenByBoss => frozenByBossTimer > 0f;
        public int TotalInvestedGold { get; private set; }

        public void InitializeTower(TowerDataSO data, WaveSpawner spawner)
        {
            towerData = data;
            waveSpawnerRef = spawner;
            currentUpgradeLevel = 1;

            TowerLevelStats lv1Stats = towerData.GetStatsForLevel(1);
            TotalInvestedGold = lv1Stats.GoldCost;
        }

        private void Update()
        {
            if (towerData == null) return;
            if (GameManager.Instance != null && GameManager.Instance.CurrentState != GameState.Playing) return;

            // Boss EMP Şok Dalgası tarafından dondurulduysa süre bitene kadar ateş edemez
            if (frozenByBossTimer > 0f)
            {
                frozenByBossTimer -= Time.deltaTime;
                if (laserBeamRenderer != null && laserBeamRenderer.enabled)
                {
                    laserBeamRenderer.enabled = false;
                }
                if (frozenByBossTimer <= 0f && empFrozenVFX != null)
                {
                    empFrozenVFX.Stop();
                }
                return;
            }

            AcquireTarget();

            if (currentTarget != null)
            {
                RotateTurretTowardsTarget();
            }

            fireCooldownTimer -= Time.deltaTime;
            if (fireCooldownTimer <= 0f && currentTarget != null)
            {
                ExecuteAttack();
                float researchFireRateMult = GameManager.Instance != null
                    ? GameManager.Instance.ResearchTowerFireRateMultiplier
                    : 1f;
                float effectiveFireRate = towerData.GetEffectiveFireRate(currentUpgradeLevel, researchFireRateMult);
                fireCooldownTimer = effectiveFireRate > 0.01f ? (1f / effectiveFireRate) : 1f;
            }
        }

        private void AcquireTarget()
        {
            TowerLevelStats stats = towerData.GetStatsForLevel(currentUpgradeLevel);
            float rangeSqr = stats.Range * stats.Range;

            // Mevcut hedef hala hayattaysa ve menzil içindeyse hedefi koru
            if (currentTarget != null && currentTarget.IsAlive)
            {
                float distSqr = (currentTarget.transform.position - transform.position).sqrMagnitude;
                if (distSqr <= rangeSqr)
                    return;
            }

            currentTarget = null;
            if (waveSpawnerRef == null) return;

            float closestDistSqr = rangeSqr;
            var enemies = waveSpawnerRef.ActiveEnemies;

            for (int i = 0; i < enemies.Count; i++)
            {
                if (enemies[i] is EnemyController enemy && enemy != null && enemy.IsAlive)
                {
                    if (!CanTargetEnemyLayer(enemy.Data)) continue;

                    float dSqr = (enemy.transform.position - transform.position).sqrMagnitude;
                    if (dSqr <= closestDistSqr)
                    {
                        closestDistSqr = dSqr;
                        currentTarget = enemy;
                    }
                }
            }
        }

        private bool CanTargetEnemyLayer(EnemyDataSO enemyData)
        {
            if (enemyData == null) return false;
            if (enemyData.IsFlying)
            {
                return (towerData.TargetableLayers & TargetLayerMask.Flying) != 0;
            }
            return (towerData.TargetableLayers & TargetLayerMask.Ground) != 0;
        }

        private void RotateTurretTowardsTarget()
        {
            if (turretHead == null || currentTarget == null) return;

            Vector3 dir = currentTarget.transform.position - turretHead.position;
            dir.y = 0f;
            if (dir.sqrMagnitude > 0.001f)
            {
                Quaternion targetRot = Quaternion.LookRotation(dir);
                turretHead.rotation = Quaternion.Lerp(turretHead.rotation, targetRot, Time.deltaTime * 15f);
            }
        }

        private void ExecuteAttack()
        {
            TowerLevelStats stats = towerData.GetStatsForLevel(currentUpgradeLevel);
            float researchDmgMult = GameManager.Instance != null
                ? GameManager.Instance.ResearchTowerDamageMultiplier
                : 1f;
            float effectiveDamage = towerData.GetEffectiveDamage(currentUpgradeLevel, researchDmgMult);

            switch (towerData.Type)
            {
                case TowerType.RapidLaser:
                case TowerType.SniperRailgun:
                    // Tek hedefli anlık lazer / hiper-hızlı railgun atışı
                    currentTarget.TakeWeaponDamage(effectiveDamage, stats.ArmorPenetration);
                    break;

                case TowerType.PlasmaCannon:
                    // Alan hasarı (AoE Splash)
                    ApplyAreaAttack(currentTarget.transform.position, stats.SplashRadius, effectiveDamage, stats.ArmorPenetration, 0f, 0f);
                    break;

                case TowerType.EMPBlaster:
                    // Menzildeki düşmanları yavaşlatan/donduran elektromanyetik darbe
                    ApplyAreaAttack(transform.position, stats.Range, effectiveDamage, stats.ArmorPenetration, stats.SlowPercentage, stats.DebuffDuration);
                    break;
            }
        }

        private void ApplyAreaAttack(Vector3 center, float radius, float damage, float armorPen, float slowPct, float slowDur)
        {
            if (waveSpawnerRef == null) return;
            float radiusSqr = radius * radius;
            var enemies = waveSpawnerRef.ActiveEnemies;

            for (int i = enemies.Count - 1; i >= 0; i--)
            {
                if (enemies[i] is EnemyController enemy && enemy != null && enemy.IsAlive)
                {
                    if (!CanTargetEnemyLayer(enemy.Data)) continue;

                    if ((enemy.transform.position - center).sqrMagnitude <= radiusSqr)
                    {
                        enemy.TakeWeaponDamage(damage, armorPen, slowPct, slowDur);
                    }
                }
            }
        }

        /// <summary>
        /// Oyun içi altınla kuleyi bir üst seviyeye (Maksimum Seviye 3) yükseltir.
        /// </summary>
        public bool TryUpgradeTower()
        {
            if (towerData == null || currentUpgradeLevel >= towerData.MaxUpgradeLevel)
                return false;

            TowerLevelStats nextLevelStats = towerData.GetStatsForLevel(currentUpgradeLevel + 1);
            if (GameManager.Instance == null || !GameManager.Instance.TrySpendInGameGold(nextLevelStats.GoldCost))
                return false;

            currentUpgradeLevel++;
            TotalInvestedGold += nextLevelStats.GoldCost;
            return true;
        }

        /// <summary>
        /// Boss'un EMP şok dalgası isabet ettiğinde kuleyi geçici süreyle devre dışı bırakır.
        /// </summary>
        public void ApplyBossFreeze(float duration)
        {
            frozenByBossTimer = Mathf.Max(frozenByBossTimer, duration);
            if (empFrozenVFX != null && !empFrozenVFX.isPlaying)
            {
                empFrozenVFX.Play();
            }
        }
    }
}
