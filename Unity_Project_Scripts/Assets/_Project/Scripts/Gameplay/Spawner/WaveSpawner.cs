using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using NeonVoid.Core;
using NeonVoid.Data;

namespace NeonVoid.Gameplay.Spawner
{
    /// <summary>
    /// Sahnede aktif olan bir düşmanın çalışma zamanı (Runtime) referansı ve ölçeklenmiş istatistikleri.
    /// Orbital Lazer ve kule hedefleme sistemleri bu arayüz/veri üzerinden düşmanlara erişir.
    /// </summary>
    public interface ISpawnedEnemy
    {
        void Initialize(EnemyDataSO data, float scaledMaxHealth, float scaledArmorRatio, Transform[] waypoints, Action<ISpawnedEnemy, bool> onRemovedCallback);
        void TakeTrueDamage(float amount);
        bool IsAlive { get; }
        Transform Transform { get; }
    }

    /// <summary>
    /// 100 bölüm boyunca DifficultyCalculator formüllerini kullanarak dalgaları (Wave) prosedürel olarak
    /// oluşturan, her 10. bölümde Boss çıkaran ve aktif düşmanları takip eden Spawner sistemi.
    /// </summary>
    public class WaveSpawner : MonoBehaviour
    {
        [Header("Yol (Waypoint) ve Doğuş Noktası")]
        [SerializeField] private Transform spawnPoint;
        [SerializeField] private Transform[] waypointPath;

        [Header("Düşman Veri Havuzu (ScriptableObjects)")]
        [SerializeField] private EnemyDataSO[] swarmEnemies;
        [SerializeField] private EnemyDataSO[] tankEnemies;
        [SerializeField] private EnemyDataSO[] flyingEnemies;
        [SerializeField] private EnemyDataSO[] bossEnemies;

        [Header("Dalga Zamanlama Ayarları")]
        [Tooltip("İki dalga arasındaki hazırlık/kule kurma süresi (saniye).")]
        [SerializeField] private float timeBetweenWaves = 6.0f;

        [Tooltip("Swarm birimlerinin arka arkaya doğuş aralığı (saniye).")]
        [SerializeField] private float swarmSpawnInterval = 0.35f;

        [Tooltip("Standart/Tank birimlerinin doğuş aralığı (saniye).")]
        [SerializeField] private float standardSpawnInterval = 0.85f;

        // UI ve GameManager için Olaylar (Observer Pattern)
        public event Action<int, int> OnWaveChanged;               // (currentWave, totalWaves)
        public event Action<float> OnWaveCountdownUpdated;         // (secondsRemaining)
        public event Action<EnemyDataSO> OnBossWaveIncoming;       // Boss uyarısı (UI Alarmı)
        public event Action OnAllWavesCleared;                     // Bölümdeki tüm dalgalar ve düşmanlar temizlendi

        private readonly List<ISpawnedEnemy> activeEnemies = new List<ISpawnedEnemy>();
        private Coroutine waveLoopCoroutine;
        private int currentLevel = 1;
        private int currentWaveIndex = 0;
        private int totalWavesInCurrentLevel = 3;
        private bool isSpawning = false;

        public IReadOnlyList<ISpawnedEnemy> ActiveEnemies => activeEnemies;
        public int CurrentWaveNumber => currentWaveIndex + 1;
        public int TotalWavesInLevel => totalWavesInCurrentLevel;

        /// <summary>
        /// GameManager tarafından bölüm başladığında çağrılır ve 100 bölümlük formüle göre dalga döngüsünü başlatır.
        /// </summary>
        public void StartLevelWaves(int levelNumber)
        {
            StopWaveSystem();

            currentLevel = Mathf.Clamp(levelNumber, 1, DifficultyCalculator.MaxCampaignLevels);
            currentWaveIndex = 0;

            LevelDifficultySnapshot initialSnapshot = DifficultyCalculator.CalculateDifficulty(currentLevel, 0);
            totalWavesInCurrentLevel = initialSnapshot.TotalWavesInLevel;

            waveLoopCoroutine = StartCoroutine(RunLevelWavesRoutine());
        }

        public void StopWaveSystem()
        {
            if (waveLoopCoroutine != null)
            {
                StopCoroutine(waveLoopCoroutine);
                waveLoopCoroutine = null;
            }
            isSpawning = false;
        }

        /// <summary>
        /// Ödüllü reklamla çağrılan "Orbital Lazer" yeteneği için sahnedeki tüm aktif düşmanlara
        /// zırhı yok sayan (True Damage) devasa alan hasarı uygular.
        /// </summary>
        public void TriggerOrbitalStrikeDamage(float trueDamageAmount)
        {
            // Tersten döngü: Düşman ölürse listeden silineceği için InvalidOperationException önlenir
            for (int i = activeEnemies.Count - 1; i >= 0; i--)
            {
                if (activeEnemies[i] != null && activeEnemies[i].IsAlive)
                {
                    activeEnemies[i].TakeTrueDamage(trueDamageAmount);
                }
            }
        }

        private IEnumerator RunLevelWavesRoutine()
        {
            for (currentWaveIndex = 0; currentWaveIndex < totalWavesInCurrentLevel; currentWaveIndex++)
            {
                // Dalga öncesi geri sayım (Oyuncuya kule kurması veya upgrade yapması için süre tanır)
                float countdown = timeBetweenWaves;
                while (countdown > 0f)
                {
                    OnWaveCountdownUpdated?.Invoke(countdown);
                    countdown -= Time.deltaTime;
                    yield return null;
                }
                OnWaveCountdownUpdated?.Invoke(0f);

                // Mevcut dalganın zorluk verilerini hesapla
                LevelDifficultySnapshot snapshot = DifficultyCalculator.CalculateDifficulty(currentLevel, currentWaveIndex);
                OnWaveChanged?.Invoke(currentWaveIndex + 1, totalWavesInCurrentLevel);

                // Bu dalganın düşman kuyruğunu oluştur ve sahneye sür
                Queue<EnemyDataSO> waveQueue = GenerateProceduralWaveQueue(snapshot, currentWaveIndex, totalWavesInCurrentLevel);
                yield return StartCoroutine(SpawnWaveQueueRoutine(waveQueue, snapshot));

                // Dalgadaki tüm düşmanlar yok edilene (veya üsse girene) kadar bekle
                while (activeEnemies.Count > 0)
                {
                    yield return null;
                }
            }

            // Tüm dalgalar bitti ve sahnede düşman kalmadı -> Bölüm Başarıyla Tamamlandı!
            OnAllWavesCleared?.Invoke();
        }

        /// <summary>
        /// Dalga bütçesine (WaveThreatBudget) ve bölüm numarasına göre Swarm, Flying, Tank ve Boss
        /// düşmanlarından oluşan dengeli bir üretim kuyruğu hazırlar.
        /// </summary>
        private Queue<EnemyDataSO> GenerateProceduralWaveQueue(LevelDifficultySnapshot snapshot, int waveIdx, int totalWaves)
        {
            Queue<EnemyDataSO> queue = new Queue<EnemyDataSO>();
            int remainingBudget = snapshot.WaveThreatBudget;
            bool isFinalWave = (waveIdx == totalWaves - 1);

            // KURAL: Her 10 bölümde bir (10, 20, 30... 100) son dalgada dev Boss sahneye iner
            if (snapshot.IsBossLevel && isFinalWave && bossEnemies != null && bossEnemies.Length > 0)
            {
                EnemyDataSO selectedBoss = SelectEnemyByLevel(bossEnemies, snapshot.LevelNumber);
                if (selectedBoss != null)
                {
                    OnBossWaveIncoming?.Invoke(selectedBoss);
                    queue.Enqueue(selectedBoss);
                    remainingBudget = Mathf.Max(6, remainingBudget - selectedBoss.ThreatCost);
                }
            }

            // Kalan bütçeyi Swarm (%50), Tank (%25) ve Flying (%25) arketiplerine dağıt
            int safetyIteration = 0;
            while (remainingBudget > 0 && safetyIteration < 250)
            {
                safetyIteration++;
                EnemyDataSO candidate = PickWeightedEnemy(snapshot.LevelNumber, waveIdx, remainingBudget);

                if (candidate == null)
                    break;

                queue.Enqueue(candidate);
                remainingBudget -= Mathf.Max(1, candidate.ThreatCost);
            }

            return queue;
        }

        private EnemyDataSO PickWeightedEnemy(int level, int waveIdx, int availableBudget)
        {
            float roll = UnityEngine.Random.value;

            // Tank birimler 3. bölümden, Flying dronlar 5. bölümden itibaren dalgalara dahil olur
            bool canSpawnTank = level >= 3 && waveIdx >= 1 && tankEnemies != null && tankEnemies.Length > 0;
            bool canSpawnFlying = level >= 5 && waveIdx >= 1 && flyingEnemies != null && flyingEnemies.Length > 0;

            if (canSpawnTank && roll < 0.25f)
            {
                EnemyDataSO tank = SelectEnemyByLevel(tankEnemies, level);
                if (tank != null && tank.ThreatCost <= availableBudget)
                    return tank;
            }
            else if (canSpawnFlying && roll < 0.50f)
            {
                EnemyDataSO flyer = SelectEnemyByLevel(flyingEnemies, level);
                if (flyer != null && flyer.ThreatCost <= availableBudget)
                    return flyer;
            }

            return SelectEnemyByLevel(swarmEnemies, level);
        }

        private EnemyDataSO SelectEnemyByLevel(EnemyDataSO[] pool, int level)
        {
            if (pool == null || pool.Length == 0) return null;

            List<EnemyDataSO> eligible = new List<EnemyDataSO>();
            for (int i = 0; i < pool.Length; i++)
            {
                if (pool[i] != null && pool[i].MinUnlockLevel <= level)
                {
                    eligible.Add(pool[i]);
                }
            }

            if (eligible.Count == 0) return pool[0];
            return eligible[UnityEngine.Random.Range(0, eligible.Count)];
        }

        private IEnumerator SpawnWaveQueueRoutine(Queue<EnemyDataSO> queue, LevelDifficultySnapshot snapshot)
        {
            isSpawning = true;

            while (queue.Count > 0)
            {
                if (GameManager.Instance != null && GameManager.Instance.CurrentState != GameState.Playing)
                {
                    yield return null;
                    continue;
                }

                EnemyDataSO enemyData = queue.Dequeue();
                SpawnSingleEnemy(enemyData, snapshot);

                float delay = enemyData.Category == EnemyCategory.Swarm ? swarmSpawnInterval : standardSpawnInterval;
                yield return new WaitForSeconds(delay);
            }

            isSpawning = false;
        }

        private void SpawnSingleEnemy(EnemyDataSO data, LevelDifficultySnapshot snapshot)
        {
            if (data == null || data.EnemyPrefab == null || spawnPoint == null) return;

            // NOT: Prodüksiyon aşamasında Instantiate yerine ObjectPoolManager.Spawn() çağrılır
            GameObject enemyObj = Instantiate(data.EnemyPrefab, spawnPoint.position, spawnPoint.rotation);

            float scaledHP = data.BaseMaxHealth * snapshot.HealthMultiplier;
            float scaledArmor = Mathf.Clamp(data.BaseArmorRatio + snapshot.ArmorBonus, 0f, 0.85f);

            if (enemyObj.TryGetComponent<ISpawnedEnemy>(out ISpawnedEnemy spawnedEnemy))
            {
                activeEnemies.Add(spawnedEnemy);
                spawnedEnemy.Initialize(data, scaledHP, scaledArmor, waypointPath, HandleEnemyRemoved);
            }
        }

        /// <summary>
        /// Düşman öldüğünde (`killedByPlayer = true`) veya üsse ulaştığında (`killedByPlayer = false`) tetiklenir.
        /// </summary>
        private void HandleEnemyRemoved(ISpawnedEnemy enemy, bool killedByPlayer)
        {
            activeEnemies.Remove(enemy);
        }
    }
}