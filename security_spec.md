# Security Specification & Threat Model For Gasino Auth

## 1. Data Invariants
* A User document must only be written (create) if authenticated as that exact UID (`request.auth.uid == userId`).
* The phoneNumber must be present, and must be valid phone digits.
* The isPremium flag and premiumExpiry fields can only be set or modified if they correspond to verified transactions (e.g., they default to false on creation, or can only be synchronized if signed by a server / system, or here, restricted from arbitrary non-owner spoofing).
* Temporal Integrity: `createdAt` must match `request.time` exactly.

## 2. The "Dirty Dozen" Threat Payloads
To assure that no update-gaps exist, here are 12 malicious payload patterns that Firebase rules MUST reject:

1. **Anonymous Write / No Auth**: Attempting to write a profile without signing in.
2. **Identity Spoofing**: Attempted create/update on user profile `/users/VictimUID` with `request.auth.uid = HackerUID`.
3. **Privilege Escalation**: Modifying `isPremium = true` and `premiumExpiry = 9999999999999` directly from a standard client-side SDK.
4. **Phony User Id / Path Poisoning**: Registering a custom payload with a 2MB binary string as the document ID path parameter.
5. **Orphaned Profile Timestamp**: Creating a profile where `createdAt` is hardcoded as a past date (representing client time) instead of `request.time`.
6. **Malformed Phone Number**: Submitting a phone number field containing alpha characters, or a length exceeding a standard range.
7. **Ghost Field / Shadow Key Attack**: Inserting unintended schema keys like `isAdmin = true` or `shadowField = "hack"`.
8. **Immutability Breach**: An authenticated user attempts to modify their original `createdAt` timestamp.
9. **Malformed Email Verification Bypass**: Forging custom claims or passing spoofed parameters.
10. **Terminal State Locking Override**: Tampering with immutable parameters like `userId`.
11. **Denial of Wallet Bulk Read**: Initiating blanket list queries over `/users` collection without proper relational auth filtering (`allow list: if false`).
12. **Double-Write Race Invariant**: Creating an inconsistent profile layout.

## 3. Security Rules Outline (Vazirmatn / Persian Native Gas App)
The ruleset will reject any updates to `isPremium` from client writes, reserving subscription status to proper billing flows. We enforce strict data structure checks on `/users/{userId}`:
* Read: Authorized if `request.auth.uid == userId`.
* Create: Allowed only if `request.auth.uid == userId` and properties match standard user blueprint.
* Update: Allowed only for limited safe properties like fields (`fullName`), excluding `isPremium` (or keeping `isPremium` immutable under client writes unless in an administrator bypass, depending on backend transaction confirmations).
