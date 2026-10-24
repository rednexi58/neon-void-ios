// The balance and transaction ledger must be persisted in the same save record.
function commitGrant(state, grant, persist) {
  if (!grant.transactionId || !Number.isSafeInteger(grant.totalGems) || grant.totalGems <= 0) {
    throw new Error('Geçersiz satın alma teslimatı.');
  }
  const key = 'apple:' + grant.transactionId;
  if (Object.prototype.hasOwnProperty.call(state.purchaseTransactions, key)) return false;
  const previousBalance = state.cyberCore;
  const previousLedger = state.purchaseTransactions;
  const balance = previousBalance + grant.totalGems;
  if (!Number.isSafeInteger(balance) || balance < 0) throw new Error('Elmas bakiyesi geçersiz.');
  state.cyberCore = balance;
  state.purchaseTransactions = { ...previousLedger, [key]: grant.totalGems };
  try {
    if (persist() !== true) throw new Error('Satın alma kaydedilemedi.');
  } catch (error) {
    state.cyberCore = previousBalance;
    state.purchaseTransactions = previousLedger;
    throw error;
  }
  return true;
}

function createDelivery({ packs, vipId, grant, unlockVip, finish, onError }) {
  const pending = new Map();
  let chain = Promise.resolve();
  function drain() {
    chain = chain.then(async () => {
      for (const [id, transaction] of pending) {
        try {
          if (!transaction.transactionId) throw new Error('Apple işlem numarası bulunamadı.');
          if (transaction.isPending) continue;
          const items = transaction.products || [];
          if (!items.length || items.some(item => item.id !== vipId && !packs[item.id])) {
            throw new Error('Tanınmayan Apple ürünü; işlem tamamlanmadı.');
          }
          const quantity = transaction.quantity ?? 1;
          if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error('Geçersiz satın alma adedi.');
          const totalGems = items.reduce((sum, item) => sum + (packs[item.id]?.totalGems || 0) * quantity, 0);
          if (totalGems && await grant({ transactionId: id, totalGems }) !== true) continue;
          if (items.some(item => item.id === vipId) && await unlockVip() !== true) continue;
          const result = await finish(transaction);
          if (result?.isError) throw new Error(result.message || 'İşlem tamamlanamadı.');
          pending.delete(id);
        } catch (error) { onError(error); }
      }
    });
    return chain;
  }
  return {
    approve(transaction) {
      if (!transaction.transactionId) { onError(new Error('Apple işlem numarası bulunamadı.')); return Promise.resolve(); }
      pending.set(transaction.transactionId, transaction);
      return drain();
    },
    retry: drain,
    get pendingCount() { return pending.size; }
  };
}
module.exports = { commitGrant, createDelivery };
