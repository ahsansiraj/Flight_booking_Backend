/*******************************************************************************
 * User Data Model/Interface
 * Define user data structure and validation rules
 ******************************************************************************/

class User {
  constructor(data = {}) {
    this.user_id = data.user_id;
    this.user_uuid = data.user_uuid;
    this.email = data.email;
    this.username = data.username;
    this.password_hash = data.password_hash;
    this.first_name = data.first_name;
    this.last_name = data.last_name;
    this.phone = data.phone;
    this.user_type = data.user_type; // 'ADMIN', 'AGENT'
    this.agent_tier = data.agent_tier; // 'SILVER', 'GOLD', 'PLATINUM'
    this.status = data.status; // 'ACTIVE', 'INACTIVE', 'SUSPENDED'
    this.is_email_verified = data.is_email_verified;
    this.is_kyc_verified = data.is_kyc_verified;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Exclude sensitive fields
  toJSON() {
    const obj = { ...this };
    delete obj.password_hash;
    delete obj.password_salt;
    return obj;
  }

  // Check if user is admin
  isAdmin() {
    return this.user_type === 'ADMIN';
  }

  // Check if user is agent
  isAgent() {
    return this.user_type === 'AGENT';
  }

  // Get full name
  getFullName() {
    return `${this.first_name} ${this.last_name}`.trim();
  }
}

module.exports = User;