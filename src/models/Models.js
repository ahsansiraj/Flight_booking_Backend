/*******************************************************************************
 * Wallet Data Model/Interface
 ******************************************************************************/

class Wallet {
  constructor(data = {}) {
    this.wallet_id = data.wallet_id;
    this.wallet_uuid = data.wallet_uuid;
    this.agent_id = data.agent_id;
    this.current_balance = data.current_balance;
    this.total_credited = data.total_credited;
    this.total_debited = data.total_debited;
    this.status = data.status; // 'ACTIVE', 'FROZEN', 'SUSPENDED'
    this.low_balance_threshold = data.low_balance_threshold;
    this.last_transaction_at = data.last_transaction_at;
    this.last_recharge_at = data.last_recharge_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Check if balance is low
  isLowBalance() {
    return this.current_balance < this.low_balance_threshold;
  }

  // Check if wallet is active
  isActive() {
    return this.status === 'ACTIVE';
  }

  // Get available balance
  getAvailableBalance() {
    return this.isActive() ? this.current_balance : 0;
  }

  // Check if sufficient balance
  hasSufficientBalance(amount) {
    return this.current_balance >= amount;
  }
}

module.exports = Wallet;