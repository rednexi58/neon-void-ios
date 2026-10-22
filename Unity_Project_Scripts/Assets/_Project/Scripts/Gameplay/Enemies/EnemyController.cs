using System;
using UnityEngine;
using NeonVoid.Core;
using NeonVoid.Data;
using NeonVoid.Gameplay.Spawner;
using NeonVoid.Gameplay.Towers;

namespace NeonVoid.Gameplay.Enemies
{
    /// <summary>
    /// Waypoint rotası boyunca ilerleyen, zırh azaltmalı hasar alan, EMP yavaşlatma etkilerine
    /// tepki veren ve Boss ise periyodik olarak etrafındaki kuleleri donduran (EMP Pulse) düşman kontrolcüsü.
    /// </summary>
    public class EnemyController : MonoBehaviour, ISpawnedEnemy
    {
        [Header("Görsel ve UI Referansları")]
        [SerializeField] private Transform visualRoot;
        [SerializeField] private ParticleSystem bossEmpPulseVFX;

        private EnemyDataSO enemyData;
        private Transform[] waypoints;
        private int currentWaypointIndex = 0;

        private float maxHealth;
        private float currentHealth;
        private float currentArmorRatio;

        // Yavaşlatma (EMP Blaster) değişkenleri
        private float activeSlowRatio = 0f;
        private float slowTimer = 0f;

        // Boss Kule Dondurma (Freeze Pulse) zamanlayıcısı
        private float bossFreezeTimer = 0f;

        private Action<ISpawnedEnemy, bool> onRemovedCallback;
        private bool isDeadOrRemoved = false;

        public bool IsAlive => !isDeadOrRemoved && currentHealth > 0f;
        public Transform Transform => transform;
        public EnemyDataSO Data => enemyData;
        public float CurrentHealth => currentHealth;
        public float MaxHealth => maxHealth;
        public float ArmorRatio => currentArmorRatio;

        public void Initialize(
            EnemyDataSO data,
            float scaledMaxHealth,
            float scaledArmorRatio,
            Transform[] pathWaypoints,
            Action<ISpawnedEnemy, bool> onRemoved)
        {
            enemyData = data;
            maxHealth = Mathf.Max(1f, scaledMaxHealth);
            currentHealth = maxHealth;
            currentArmorRatio = Mathf.Clamp(scaledArmorRatio, 0f, 0.85f);
            waypoints = pathWaypoints;
            currentWaypointIndex = 0;
            onRemovedCallback = onRemoved;
            isDeadOrRemoved = false;

            activeSlowRatio = 0f;
            slowTimer = 0f;
            bossFreezeTimer = data != null ? data.BossFreezePulseInterval : 8f;

            if (waypoints != null && waypoints.Length > 0 && waypoints[0] != null)
            {
                transform.position = waypoints[0].position;
                currentWaypointIndex = 1;
            }
        }

        private void Update()
        {
            if (!IsAlive) return;
            if (GameManager.Instance != null && GameManager.Instance.CurrentState != GameState.Playing) return;

            UpdateSlowDebuff();
            MoveAlongWaypoints();

            if (enemyData != null && enemyData.IsBoss)
            {
                UpdateBossTowerFreezeAbility();
            }
        }

        private void UpdateSlowDebuff()
        {
            if (slowTimer > 0f)
            {
                slowTimer -= Time.deltaTime;
                if (slowTimer <= 0f)
                {
                    activeSlowRatio = 0f;
                }
            }
        }

        private void MoveAlongWaypoints()
        {
            if (waypoints == null || currentWaypointIndex >= waypoints.Length)
            {
                ReachCyberNexus();
                return;
            }

            Transform targetPoint = waypoints[currentWaypointIndex];
            if (targetPoint == null)
            {
                currentWaypointIndex++;
                return;
            }

            float effectiveSpeed = enemyData.MoveSpeed * (1f - Mathf.Clamp(activeSlowRatio, 0f, 0.85f));
            Vector3 direction = (targetPoint.position - transform.position);
            float distanceThisFrame = effectiveSpeed * Time.deltaTime;

            if (direction.magnitude <= distanceThisFrame)
            {
                transform.position = targetPoint.position;
                currentWaypointIndex++;

                if (currentWaypointIndex >= waypoints.Length)
                {
                    ReachCyberNexus();
                }
            }
            else
            {
                transform.position += direction.normalized * distanceThisFrame;
                if (visualRoot != null && direction.sqrMagnitude > 0.001f)
                {
                    visualRoot.rotation = Quaternion.Lerp(
                        visualRoot.rotation,
                        Quaternion.LookRotation(direction.normalized, Vector3.up),
                        Time.deltaTime * 12f
                    );
                }
            }
        }

        /// <summary>
        /// Boss her BossFreezePulseInterval saniyede bir menzilindeki tüm kuleleri dondurur.
        /// </summary>
        private void UpdateBossTowerFreezeAbility()
        {
            bossFreezeTimer -= Time.deltaTime;
            if (bossFreezeTimer > 0f) return;

            bossFreezeTimer = enemyData.BossFreezePulseInterval;

            if (bossEmpPulseVFX != null)
            {
                bossEmpPulseVFX.Play();
            }

            Collider[] hitColliders = Physics.OverlapSphere(transform.position, enemyData.BossFreezeRadius);
            for (int i = 0; i < hitColliders.Length; i++)
            {
                if (hitColliders[i].TryGetComponent<TowerController>(out TowerController tower))
                {
                    tower.ApplyBossFreeze(enemyData.BossTowerFreezeDuration);
                }
            }
        }

        /// <summary>
        /// Kule mermileri tarafından çağrılır; zırh ve zırh delme (Armor Penetration) hesabını uygular.
        /// </summary>
        public void TakeWeaponDamage(float rawDamage, float armorPenetration, float slowPercent = 0f, float slowDuration = 0f)
        {
            if (!IsAlive) return;

            if (slowPercent > 0f && slowDuration > 0f)
            {
                activeSlowRatio = Mathf.Max(activeSlowRatio, slowPercent);
                slowTimer = Mathf.Max(slowTimer, slowDuration);
            }

            if (rawDamage > 0f)
            {
                float finalDamage = DifficultyCalculator.ComputeFinalDamage(rawDamage, currentArmorRatio, armorPenetration);
                currentHealth -= finalDamage;

                if (currentHealth <= 0f)
                {
                    Die();
                }
            }
        }

        /// <summary>
        /// Ödüllü reklamla çağrılan Orbital Lazer gibi gerçek hasar (True Damage) kaynakları için zırhı yok sayar.
        /// </summary>
        public void TakeTrueDamage(float amount)
        {
            if (!IsAlive) return;

            currentHealth -= Mathf.Max(0f, amount);
            if (currentHealth <= 0f)
            {
                Die();
            }
        }

        private void Die()
        {
            if (isDeadOrRemoved) return;
            isDeadOrRemoved = true;

            if (enemyData != null && GameManager.Instance != null)
            {
                GameManager.Instance.AddInGameGold(enemyData.GoldReward);
            }

            if (enemyData != null && enemyData.DeathExplosionVFXPrefab != null)
            {
                Instantiate(enemyData.DeathExplosionVFXPrefab, transform.position, Quaternion.identity);
            }

            onRemovedCallback?.Invoke(this, true);
            Destroy(gameObject);
        }

        private void ReachCyberNexus()
        {
            if (isDeadOrRemoved) return;
            isDeadOrRemoved = true;

            if (GameManager.Instance != null && enemyData != null)
            {
                GameManager.Instance.DamageCyberNexus(enemyData.BaseNexusDamage);
            }

            onRemovedCallback?.Invoke(this, false);
            Destroy(gameObject);
        }
    }
}
