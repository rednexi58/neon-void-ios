using UnityEngine;
using NeonVoid.Core;
using NeonVoid.Data;
using NeonVoid.Gameplay.Spawner;
using NeonVoid.Gameplay.Towers;

namespace NeonVoid.Gameplay.Grid
{
    /// <summary>
    /// Yolun etrafındaki belirlenmiş boş soket (Grid) alanlarını temsil eder.
    /// Oyuncu yalnızca bu soketlere kule kurabilir, mevcut kuleyi 3. seviyeye kadar yükseltebilir veya satabilir.
    /// </summary>
    public class TowerSocket : MonoBehaviour
    {
        [SerializeField] private Transform buildAnchor;
        [SerializeField] private Renderer socketRenderer;
        [SerializeField] private Color emptySocketNeonColor = new Color(0f, 0.95f, 1f, 0.5f);
        [SerializeField] private Color occupiedSocketNeonColor = new Color(0.15f, 0.25f, 0.35f, 0.8f);

        public TowerController InstalledTower { get; private set; }
        public bool IsOccupied => InstalledTower != null;

        /// <summary>
        /// Seçilen kuleyi oyun içi altın karşılığında bu sokete inşa eder.
        /// </summary>
        public bool TryBuildTower(TowerDataSO towerData, WaveSpawner spawner)
        {
            if (IsOccupied || towerData == null) return false;

            TowerLevelStats lv1Stats = towerData.GetStatsForLevel(1);
            if (GameManager.Instance == null || !GameManager.Instance.TrySpendInGameGold(lv1Stats.GoldCost))
                return false;

            Transform spawnTransform = buildAnchor != null ? buildAnchor : transform;
            GameObject prefabToSpawn = lv1Stats.LevelVisualPrefab;
            if (prefabToSpawn == null) return false;

            GameObject towerInstance = Instantiate(prefabToSpawn, spawnTransform.position, spawnTransform.rotation, spawnTransform);
            if (towerInstance.TryGetComponent<TowerController>(out TowerController controller))
            {
                InstalledTower = controller;
                controller.InitializeTower(towerData, spawner);
                UpdateSocketVisual();
                return true;
            }

            return false;
        }

        public bool TryUpgradeInstalledTower()
        {
            if (!IsOccupied) return false;
            return InstalledTower.TryUpgradeTower();
        }

        public void SellInstalledTower()
        {
            if (!IsOccupied) return;

            TowerLevelStats currentStats = InstalledTower.Data.GetStatsForLevel(InstalledTower.CurrentUpgradeLevel);
            int refund = currentStats.SellRefundGold > 0
                ? currentStats.SellRefundGold
                : Mathf.RoundToInt(InstalledTower.TotalInvestedGold * 0.7f);

            if (GameManager.Instance != null)
            {
                GameManager.Instance.AddInGameGold(refund);
            }

            Destroy(InstalledTower.gameObject);
            InstalledTower = null;
            UpdateSocketVisual();
        }

        private void UpdateSocketVisual()
        {
            if (socketRenderer != null && socketRenderer.material != null)
            {
                socketRenderer.material.color = IsOccupied ? occupiedSocketNeonColor : emptySocketNeonColor;
            }
        }
    }
}
