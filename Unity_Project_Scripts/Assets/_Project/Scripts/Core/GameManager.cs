using System;
using UnityEngine;
using NeonVoid.Data;
using NeonVoid.Gameplay.Spawner;

namespace NeonVoid.Core
{
    public enum GameState
    {
        MainMenu,
        Playing,
        Paused,
        LevelComplete,
        GameOver
    }

    /// <summary>
    /// Reklam (AdMob / Unity Ads) servisleri için gevşek bağlı (decoupled) arayüz.
    /// Gerçek SDK entegrasyonu bu arayüzü implemente eden AdsManager sınıfında yapılır.
    /// </summary>
    public interface IAdsService
    {
        void ShowInterstitialAd(Action onAdClosed);
        void ShowRewardedAd(string placementId, Action onRewardGranted, Action onAdFailed = null);
        bool IsRewardedAdReady(string placementId);
    }

    /// <summary>
    /// Oyun akışını, oyun içi (Gold) ve bölüm dışı (Gear / Cyber-Core) ekonomiyi,
    /// Araştırma Laboratuvarı (Skill Tree) kalıcı güçlendirmelerini ve Reklam/IAP tetikleyicilerini
    /// yöneten merkezi GameManager.
    /// </summary>
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        [Header("Bağlı Alt Sistemler")]
        [SerializeField] private WaveSpawner waveSpawner;

        [Header("Bölüm İçi Başlangıç Ayarları")]
        [SerializeField] private int startingInGameGold = 250;
        [SerializeField] private int defaultBaseMaxHealth = 20;

        [Header("Ödüllü Reklam: Orbital Lazer Ayarları")]
        [Tooltip("Orbital Lazerin tüm düşmanlara vuracağı taban gerçek hasar (Bölüm çarpanıyla ölçeklenir).")]
        [SerializeField] private float orbitalLaserBaseDamage = 1200f;
        [Tooltip("Orbital Lazer butonunun tekrar dolması için gereken bekleme süresi (saniye).")]
        [SerializeField] private float orbitalLaserCooldown = 45f;

        // Olaylar (UI ve Ses Sistemleri bu event'lere abone olur)
        public event Action<GameState> OnGameStateChanged;
        public event Action<int> OnInGameGoldChanged;
        public event Action<int, int> OnNexusHealthChanged;              // (currentHP, maxHP)
        public event Action<int, int> OnMetaCurrenciesChanged;           // (totalGear, totalCyberCore)
        public event Action<float, float> OnOrbitalLaserCooldownChanged; // (remainingCooldown, maxCooldown)
        public event Action OnOrbitalLaserExecuted;

        // Durum Değişkenleri
        public GameState CurrentState { get; private set; } = GameState.MainMenu;
        public int CurrentLevel { get; private set; } = 1;
        public int InGameGold { get; private set; }
        public int CurrentNexusHealth { get; private set; }
        public int EffectiveMaxNexusHealth { get; private set; }

        // Meta-Oyun (Kalıcı) Para Birimleri ve IAP Durumu
        public int TotalGearCurrency { get; private set; }
        public int TotalCyberCoreCurrency { get; private set; }
        public bool IsRemoveAdsPurchased { get; private set; }

        // Araştırma Laboratuvarı (Skill Tree) Kalıcı Çarpanları
        public float ResearchTowerDamageMultiplier { get; private set; } = 1.0f;
        public float ResearchTowerFireRateMultiplier { get; private set; } = 1.0f;
        public int ResearchBonusNexusHealth { get; private set; } = 0;

        // Monetizasyon Sayaçları
        private int completedOrFailedLevelsCounter = 0;
        private int lastLevelEarnedGear = 0;
        private bool hasDoubledRewardThisLevel = false;
        private float currentOrbitalCooldown = 0f;
        private IAdsService adsService;

        private const string PREF_LEVEL = "NV_UnlockedLevel";
        private const string PREF_GEAR = "NV_Gear";
        private const string PREF_CYBERCORE = "NV_CyberCore";
        private const string PREF_REMOVE_ADS = "NV_RemoveAds";
        private const string PLACEMENT_DOUBLE_GOLD = "Rewarded_DoubleGear";
        private const string PLACEMENT_ORBITAL_LASER = "Rewarded_OrbitalLaser";

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);

            LoadPersistentData();
        }

        private void OnEnable()
        {
            if (waveSpawner != null)
            {
                waveSpawner.OnAllWavesCleared += HandleAllWavesCleared;
            }
        }

        private void OnDisable()
        {
            if (waveSpawner != null)
            {
                waveSpawner.OnAllWavesCleared -= HandleAllWavesCleared;
            }
        }

        private void Update()
        {
            if (CurrentState == GameState.Playing && currentOrbitalCooldown > 0f)
            {
                currentOrbitalCooldown = Mathf.Max(0f, currentOrbitalCooldown - Time.deltaTime);
                OnOrbitalLaserCooldownChanged?.Invoke(currentOrbitalCooldown, orbitalLaserCooldown);
            }
        }

        /// <summary>
        /// Bootstrap sahnesinde AdMob / Unity Ads servisi başlatıldığında buraya enjekte edilir.
        /// </summary>
        public void RegisterAdsService(IAdsService service)
        {
            adsService = service;
        }

        #region Bölüm Başlatma ve Oyun Akışı

        public void StartLevel(int levelNumber)
        {
            CurrentLevel = Mathf.Clamp(levelNumber, 1, DifficultyCalculator.MaxCampaignLevels);
            hasDoubledRewardThisLevel = false;
            currentOrbitalCooldown = 0f;

            // Araştırma Laboratuvarı bonuslarıyla üs canını ve başlangıç altınını ayarla
            EffectiveMaxNexusHealth = defaultBaseMaxHealth + ResearchBonusNexusHealth;
            CurrentNexusHealth = EffectiveMaxNexusHealth;
            InGameGold = startingInGameGold;

            SetGameState(GameState.Playing);
            OnInGameGoldChanged?.Invoke(InGameGold);
            OnNexusHealthChanged?.Invoke(CurrentNexusHealth, EffectiveMaxNexusHealth);
            OnOrbitalLaserCooldownChanged?.Invoke(0f, orbitalLaserCooldown);

            if (waveSpawner != null)
            {
                waveSpawner.StartLevelWaves(CurrentLevel);
            }
        }

        public void DamageCyberNexus(int damageAmount)
        {
            if (CurrentState != GameState.Playing) return;

            CurrentNexusHealth = Mathf.Max(0, CurrentNexusHealth - Mathf.Max(1, damageAmount));
            OnNexusHealthChanged?.Invoke(CurrentNexusHealth, EffectiveMaxNexusHealth);

            if (CurrentNexusHealth <= 0)
            {
                TriggerGameOver();
            }
        }

        private void HandleAllWavesCleared()
        {
            if (CurrentState != GameState.Playing) return;

            LevelDifficultySnapshot snapshot = DifficultyCalculator.CalculateDifficulty(CurrentLevel);
            lastLevelEarnedGear = snapshot.CompletionGearReward;

            AddMetaCurrencies(lastLevelEarnedGear, snapshot.CompletionCyberCoreReward);

            // Bir sonraki bölümü aç
            int highestUnlocked = PlayerPrefs.GetInt(PREF_LEVEL, 1);
            if (CurrentLevel >= highestUnlocked && CurrentLevel < DifficultyCalculator.MaxCampaignLevels)
            {
                PlayerPrefs.SetInt(PREF_LEVEL, CurrentLevel + 1);
                PlayerPrefs.Save();
            }

            SetGameState(GameState.LevelComplete);
            EvaluateInterstitialAdTrigger();
        }

        private void TriggerGameOver()
        {
            if (waveSpawner != null)
            {
                waveSpawner.StopWaveSystem();
            }

            SetGameState(GameState.GameOver);
            EvaluateInterstitialAdTrigger();
        }

        private void SetGameState(GameState newState)
        {
            CurrentState = newState;
            Time.timeScale = (newState == GameState.Paused) ? 0f : 1f;
            OnGameStateChanged?.Invoke(CurrentState);
        }

        #endregion

        #region Oyun İçi Altın (Gold) ve Kule Ekonomisi

        public void AddInGameGold(int amount)
        {
            if (amount <= 0) return;
            InGameGold += amount;
            OnInGameGoldChanged?.Invoke(InGameGold);
        }

        public bool TrySpendInGameGold(int cost)
        {
            if (InGameGold < cost) return false;

            InGameGold -= cost;
            OnInGameGoldChanged?.Invoke(InGameGold);
            return true;
        }

        #endregion

        #region Meta-Oyun (Araştırma Laboratuvarı / Skill Tree ve Para Birimleri)

        public void AddMetaCurrencies(int gearAmount, int cyberCoreAmount)
        {
            TotalGearCurrency += Mathf.Max(0, gearAmount);
            TotalCyberCoreCurrency += Mathf.Max(0, cyberCoreAmount);
            SavePersistentData();
            OnMetaCurrenciesChanged?.Invoke(TotalGearCurrency, TotalCyberCoreCurrency);
        }

        /// <summary>
        /// Ana menüdeki Araştırma Laboratuvarı (Skill Tree) yükseltmeleri satın alındığında çağrılır.
        /// </summary>
        public bool TryUpgradeResearchNode(int gearCost, int cyberCoreCost, float damageBonusAdd, float fireRateBonusAdd, int nexusHealthAdd)
        {
            if (TotalGearCurrency < gearCost || TotalCyberCoreCurrency < cyberCoreCost)
                return false;

            TotalGearCurrency -= gearCost;
            TotalCyberCoreCurrency -= cyberCoreCost;

            ResearchTowerDamageMultiplier += damageBonusAdd;
            ResearchTowerFireRateMultiplier += fireRateBonusAdd;
            ResearchBonusNexusHealth += nexusHealthAdd;

            SavePersistentData();
            OnMetaCurrenciesChanged?.Invoke(TotalGearCurrency, TotalCyberCoreCurrency);
            return true;
        }

        #endregion

        #region Monetizasyon: Geçiş Reklamları, Ödüllü Reklamlar ve IAP

        /// <summary>
        /// KURAL: Her 2 bölüm tamamlandığında (Level Complete veya Game Over) otomatik geçiş reklamı gösterir.
        /// Oyuncu "Remove Ads" IAP paketini satın almışsa hiçbir zaman geçiş reklamı gösterilmez.
        /// </summary>
        private void EvaluateInterstitialAdTrigger()
        {
            completedOrFailedLevelsCounter++;

            if (IsRemoveAdsPurchased) return;

            if (completedOrFailedLevelsCounter % 2 == 0 && adsService != null)
            {
                adsService.ShowInterstitialAd(onAdClosed: () =>
                {
                    Debug.Log("[GameManager] 2. bölüm sonu Interstitial reklam tamamlandı.");
                });
            }
        }

        /// <summary>
        /// ÖDÜLLÜ REKLAM 1: Bölüm sonu ekranında "Kazanılan Altını/Gear'ı 2'ye Katla (Reklam İzle)" butonu.
        /// </summary>
        public void RequestDoubleLevelRewardAd()
        {
            if (CurrentState != GameState.LevelComplete || hasDoubledRewardThisLevel || lastLevelEarnedGear <= 0)
                return;

            if (adsService != null && adsService.IsRewardedAdReady(PLACEMENT_DOUBLE_GOLD))
            {
                adsService.ShowRewardedAd(PLACEMENT_DOUBLE_GOLD, onRewardGranted: () =>
                {
                    hasDoubledRewardThisLevel = true;
                    AddMetaCurrencies(lastLevelEarnedGear, 0);
                    Debug.Log($"[GameManager] Ödüllü reklam izlendi! +{lastLevelEarnedGear} ekstra Gear eklendi.");
                });
            }
        }

        /// <summary>
        /// ÖDÜLLÜ REKLAM 2: Oyun içinde sıkışınca ekranın köşesindeki butonla tüm düşmanlara hasar veren
        /// "Orbital Lazer" çağrısı.
        /// </summary>
        public void RequestOrbitalLaserAd()
        {
            if (CurrentState != GameState.Playing || currentOrbitalCooldown > 0f)
                return;

            if (adsService != null && adsService.IsRewardedAdReady(PLACEMENT_ORBITAL_LASER))
            {
                adsService.ShowRewardedAd(PLACEMENT_ORBITAL_LASER, onRewardGranted: ExecuteOrbitalLaserStrike);
            }
        }

        private void ExecuteOrbitalLaserStrike()
        {
            currentOrbitalCooldown = orbitalLaserCooldown;
            OnOrbitalLaserCooldownChanged?.Invoke(currentOrbitalCooldown, orbitalLaserCooldown);

            // Orbital Lazer hasarı da bölümün logaritmik can çarpanıyla ölçeklenir ki 90. bölümde de etkili olsun
            LevelDifficultySnapshot snapshot = DifficultyCalculator.CalculateDifficulty(CurrentLevel);
            float scaledStrikeDamage = orbitalLaserBaseDamage * snapshot.HealthMultiplier;

            if (waveSpawner != null)
            {
                waveSpawner.TriggerOrbitalStrikeDamage(scaledStrikeDamage);
            }

            OnOrbitalLaserExecuted?.Invoke();
        }

        /// <summary>
        /// IAP "Remove Ads" satın alındığında IAPManager tarafından çağrılır.
        /// </summary>
        public void UnlockRemoveAdsIAP()
        {
            IsRemoveAdsPurchased = true;
            PlayerPrefs.SetInt(PREF_REMOVE_ADS, 1);
            PlayerPrefs.Save();
        }

        /// <summary>
        /// IAP "Cyber-Core (Elmas) Paketi" satın alındığında IAPManager tarafından çağrılır.
        /// </summary>
        public void GrantCyberCoreIAPPack(int packAmount)
        {
            AddMetaCurrencies(0, packAmount);
        }

        #endregion

        #region Kayıt (Save / Load) İşlemleri

        private void SavePersistentData()
        {
            PlayerPrefs.SetInt(PREF_GEAR, TotalGearCurrency);
            PlayerPrefs.SetInt(PREF_CYBERCORE, TotalCyberCoreCurrency);
            PlayerPrefs.SetInt(PREF_REMOVE_ADS, IsRemoveAdsPurchased ? 1 : 0);
            PlayerPrefs.Save();
        }

        private void LoadPersistentData()
        {
            TotalGearCurrency = PlayerPrefs.GetInt(PREF_GEAR, 0);
            TotalCyberCoreCurrency = PlayerPrefs.GetInt(PREF_CYBERCORE, 0);
            IsRemoveAdsPurchased = PlayerPrefs.GetInt(PREF_REMOVE_ADS, 0) == 1;
        }

        #endregion
    }
}