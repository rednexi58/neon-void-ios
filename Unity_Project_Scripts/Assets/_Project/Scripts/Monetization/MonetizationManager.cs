using System;
using UnityEngine;
using NeonVoid.Core;

namespace NeonVoid.Monetization
{
    /// <summary>
    /// AdMob veya Unity Ads SDK'sını IAdsService arayüzü üzerinden GameManager'a bağlayan
    /// ve IAP ("Remove Ads" + "Cyber-Core Paketleri") satın alımlarını yöneten köprü sınıfı.
    /// </summary>
    public class MonetizationManager : MonoBehaviour, IAdsService
    {
        public static MonetizationManager Instance { get; private set; }

        [Header("AdMob / Unity Ads Birim Kimlikleri (Ad Unit IDs)")]
        [SerializeField] private string androidInterstitialId = "ca-app-pub-3940256099942544/1033173712";
        [SerializeField] private string androidRewardedId = "ca-app-pub-3940256099942544/5224354917";

        [Header("IAP Ürün Kimlikleri (Product IDs)")]
        public const string IAP_REMOVE_ADS = "com.neonvoid.cyberdefense.removeads";
        public const string IAP_CYBERCORE_SMALL = "com.neonvoid.cyberdefense.cybercore_100";
        public const string IAP_CYBERCORE_MEGA = "com.neonvoid.cyberdefense.cybercore_500";

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        private void Start()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.RegisterAdsService(this);
            }
        }

        public void ShowInterstitialAd(Action onAdClosed)
        {
            if (GameManager.Instance != null && GameManager.Instance.IsRemoveAdsPurchased)
            {
                onAdClosed?.Invoke();
                return;
            }

            Debug.Log($"[MonetizationManager] Interstitial Reklam Gösteriliyor ({androidInterstitialId})...");
            // SDK Callback simülasyonu:
            onAdClosed?.Invoke();
        }

        public void ShowRewardedAd(string placementId, Action onRewardGranted, Action onAdFailed = null)
        {
            Debug.Log($"[MonetizationManager] Ödüllü Reklam Gösteriliyor ({placementId} - {androidRewardedId})...");
            // SDK OnUserEarnedReward Callback:
            onRewardGranted?.Invoke();
        }

        public bool IsRewardedAdReady(string placementId)
        {
            return true;
        }

        /// <summary>
        /// Unity IAP OnPurchaseComplete callback'inden çağrılır.
        /// </summary>
        public void OnIAPProductPurchased(string productId)
        {
            if (GameManager.Instance == null) return;

            switch (productId)
            {
                case IAP_REMOVE_ADS:
                    GameManager.Instance.UnlockRemoveAdsIAP();
                    break;
                case IAP_CYBERCORE_SMALL:
                    GameManager.Instance.GrantCyberCoreIAPPack(100);
                    break;
                case IAP_CYBERCORE_MEGA:
                    GameManager.Instance.GrantCyberCoreIAPPack(500);
                    break;
            }
        }
    }
}
