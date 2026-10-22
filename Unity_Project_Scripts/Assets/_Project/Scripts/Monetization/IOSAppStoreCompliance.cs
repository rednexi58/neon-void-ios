using System;
using UnityEngine;
using NeonVoid.Core;

#if UNITY_IOS
using Unity.Advertisement.IosSupport;
#endif

namespace NeonVoid.Monetization
{
    /// <summary>
    /// Apple App Store ve TestFlight inceleme kuralları (Guideline 3.1.1 & 5.1.2) için
    /// iOS App Tracking Transparency (ATT) iznini ve StoreKit Restore Purchases işlemini yönetir.
    /// </summary>
    public class IOSAppStoreCompliance : MonoBehaviour
    {
        private void Start()
        {
            RequestAppleTrackingAuthorization();
        }

        public void RequestAppleTrackingAuthorization()
        {
#if UNITY_IOS
            if (ATTrackingStatusBinding.GetAuthorizationTrackingStatus() ==
                ATTrackingStatusBinding.AuthorizationTrackingStatus.NOT_DETERMINED)
            {
                ATTrackingStatusBinding.RequestAuthorizationTracking();
            }
#endif
        }

        /// <summary>
        /// Apple App Store incelemesinde zorunlu olan "Restore Purchases" (Satın Alımları Geri Yükle) butonu.
        /// </summary>
        public void RestorePurchasesOnIOS()
        {
            Debug.Log("[IOSAppStoreCompliance] Apple StoreKit satın alımları geri yükleniyor...");
            // Unity IAP IAppleExtensions.RestoreTransactions callback'i burada tetiklenir
        }
    }
}
