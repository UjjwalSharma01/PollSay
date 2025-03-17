# PollSay Project Context

## Project Overview

PollSay is an enterprise-grade polling and feedback platform with a focus on security, privacy, and data protection. It allows organizations to create custom forms with optional end-to-end encryption for sensitive data collection, enabling anonymous feedback while maintaining data integrity and security.

## Core Technologies

### Frontend
- **Pure JavaScript**: We chose vanilla JS over frameworks like React or Vue for simplicity, faster initial load times, and reduced bundle size.
- **Tailwind CSS**: Used for utility-first styling that provides rapid UI development capabilities without the overhead of custom CSS files.
- **Chart.js**: Implemented for data visualization in the analytics dashboard, chosen for its simplicity and comprehensive feature set.

### Backend
- **Supabase**: A Firebase alternative providing PostgreSQL database, authentication, storage, and real-time capabilities.
  - Chosen over Firebase for PostgreSQL's robustness and the benefit of row-level security policies.
  - Provides both client and server-side SDKs for comprehensive access control.
- **Node.js/Express**: Limited server-side code for tasks that can't be handled client-side or through Supabase functions.

### Encryption & Security
- **Web Crypto API**: Native browser cryptography APIs used to implement end-to-end encryption.
  - RSA (2048-bit) for asymmetric encryption of keys
  - AES-GCM (256-bit) for symmetric encryption of form data
  - SHA-256 for hashing and PBKDF2 for key derivation
- **Row-Level Security (RLS)**: Database-level security enforced by Supabase PostgreSQL.

## Architecture Decisions

### Client-Side Encryption
We implemented end-to-end encryption on the client side rather than server-side for several important reasons:

1. **True Privacy**: Data is encrypted before it leaves the user's device, ensuring the server never sees unencrypted sensitive data.
2. **Reduced Liability**: Even if the database is compromised, sensitive data remains encrypted.
3. **Regulatory Compliance**: Helps meet GDPR, HIPAA, and other privacy regulations by minimizing access to raw data.

### Data Model Design
- **Organization-based Multi-tenancy**: All data is organized by organization, with team members having specific roles.
- **Pseudonymization**: Response data can be pseudonymized while still allowing for tracking of user responses over time.
- **Form Templating**: Forms are structured as JSON templates that define field types, validation rules, and display options.

### Authentication Flow
- **Role-Based Access Control**: Implemented at both the application level and database level.
- **Organization Admin Controls**: Admins can invite team members and control encryption settings.
- **Email Verification**: Required for sensitive form access.

## Technical Implementation Details

### Encryption Workflow

1. **Organization Key Generation**:
   - Each organization generates an RSA key pair
   - Private key is encrypted with admin's passphrase
   - Only encrypted private key is stored in the database

2. **Form Encryption**:
   - For encrypted forms, a unique AES key is generated
   - Form key is encrypted with organization's public key
   - Form data is encrypted with the form-specific AES key

3. **Response Decryption**:
   - Admin provides passphrase to decrypt the organization's private key
   - Private key is used to decrypt the form key
   - Form key is used to decrypt individual responses

### Pseudonymization Approach

We generate pseudonyms by:
1. Combining user email with organization ID to create a unique input
2. Hashing this input with SHA-256
3. Creating a human-readable format (e.g., "HappyTiger#a1b2c3") from the hash
4. This ensures consistency for the same user across responses while maintaining anonymity

## Alternative Technologies Considered

### Frontend Frameworks
- **React**: Would provide better component reusability and state management but adds complexity and larger bundle size.
- **Vue.js**: Similar benefits to React with somewhat lower learning curve, but still adds framework overhead.
- **Svelte**: Lower runtime overhead but less community support for integration with encryption libraries.

### Backend Options
- **Firebase**: Simpler real-time capabilities but less flexible database queries and higher costs at scale.
- **AWS Amplify**: More enterprise features but steeper learning curve and potentially higher costs.
- **MongoDB Atlas**: Document storage would match our JSON data model well, but lacks the integrated auth and RLS of Supabase.

### Encryption Libraries
- **CryptoJS**: More abstracted API but less performant than Web Crypto API.
- **TweetNaCl.js**: Smaller footprint but more limited algorithm options.
- **Libsodium.js**: More comprehensive than Web Crypto API but adds significant bundle size.

## Challenges and Solutions

### Challenge 1: Key Management
**Problem**: Securely storing and retrieving encryption keys without exposing them.  
**Solution**: Password-derived encryption for private keys, with users entering their passphrase when needed rather than storing it.

### Challenge 2: Performance with Encryption
**Problem**: Encryption/decryption operations can be CPU-intensive.  
**Solution**: Implemented asynchronous processing, Web Workers for complex operations, and optimized the encryption workflow to minimize unnecessary operations.

### Challenge 3: UX with Security Features
**Problem**: Security features often degrade user experience.  
**Solution**: Progressive security approach—making encryption optional, providing clear UI indicators, and caching authentication states where appropriate.

### Challenge 4: Cross-Browser Compatibility
**Problem**: Web Crypto API implementation differences across browsers.  
**Solution**: Built feature detection and polyfills for older browsers, with graceful degradation for unsupported features.

## Shortcomings and Future Improvements

### Current Shortcomings
1. **Key Recovery**: Limited options for key recovery if a user loses their passphrase.
2. **Mobile Experience**: The interface needs optimization for smaller screens.
3. **Offline Support**: Limited functionality when users are offline.
4. **Real-time Collaboration**: No support for multiple users editing a form simultaneously.

### Planned Improvements
1. **Key Sharing**: Implement secure key sharing between organization admins.
2. **Two-Factor Authentication**: Add 2FA for accessing sensitive encrypted data.
3. **Progressive Web App**: Enable offline form creation and response collection.
4. **Advanced Analytics**: Implement ML-based insights while maintaining privacy guarantees.
5. **API Endpoints**: Create developer API for integration with other systems.

## Potential Interview Questions and Answers

### Security Questions

**Q: How do you ensure the security of encryption keys?**  
A: We never store encryption keys on the server in unencrypted form. Organization private keys are encrypted with a passphrase-derived key using PBKDF2 for key stretching with 100,000 iterations. The passphrase itself is never stored. Additionally, we encourage regular key rotation and support backing up keys securely.

**Q: What happens if a user forgets their encryption passphrase?**  
A: Currently, if the primary admin loses their passphrase, they would lose access to encrypted data. For this reason, we strongly encourage backing up keys and implementing organization policies for secure passphrase management. We're also planning to implement a key recovery system using a multi-party authorization approach where multiple admins would need to approve recovery.

**Q: How does your encryption approach compare to alternatives like TLS-only encryption?**  
A: TLS only encrypts data in transit, leaving it vulnerable once it reaches the server. Our end-to-end encryption protects data at rest and ensures that even database administrators or potential attackers with database access cannot read sensitive information. This provides a much stronger security model, especially for organizations handling highly confidential data.

### Technical Architecture Questions

**Q: Why did you choose Supabase over Firebase?**  
A: Several reasons: 1) Supabase provides PostgreSQL which offers more powerful querying capabilities and better performance for complex data; 2) Row-level security in PostgreSQL gives us fine-grained access control; 3) Supabase is open-source with no vendor lock-in; 4) PostgreSQL's JSONB type gives us flexibility similar to NoSQL while maintaining relational integrity.

**Q: Why implement encryption client-side rather than server-side?**  
A: Client-side encryption ensures the server never sees unencrypted sensitive data, providing true end-to-end protection. This reduces liability, enhances privacy, and helps with regulatory compliance. Server-side encryption would still leave data vulnerable to system administrators or breaches of the application server.

**Q: How do you handle the performance impact of client-side encryption?**  
A: We optimize by: 1) Using the native Web Crypto API which is highly optimized; 2) Implementing encryption operations asynchronously to avoid UI blocking; 3) Only encrypting sensitive fields rather than entire forms; 4) Using Web Workers for heavy encryption operations; 5) Implementing caching strategies for frequently accessed encrypted data.

### Frontend Architecture Questions

**Q: Why did you choose vanilla JavaScript instead of a framework like React?**  
A: Our decision was based on: 1) Smaller bundle size and faster initial load time which is important for our user experience; 2) The application has relatively simple state management needs that don't justify a framework; 3) Better browser compatibility without transpilation; 4) Reduced dependency overhead for security auditing. That said, as the application scales, we may consider adopting a framework for better maintainability.

**Q: How do you handle state management without a framework?**  
A: We use a combination of: 1) Module-level state through ES modules; 2) Custom event listeners for component communication; 3) Local storage and session storage for persistent state; 4) Query parameters for shareable state. This approach has been sufficient for our current needs while keeping the codebase simple.

### Database Questions

**Q: How do you ensure data isolation between different organizations?**  
A: We implement Row-Level Security (RLS) policies in PostgreSQL that automatically filter queries based on the authenticated user's organization. Every table with organization data has an `org_id` column, and RLS policies ensure users can only access rows belonging to their organization. This is enforced at the database level, not just in application code.

**Q: How do you handle database migrations and schema changes?**  
A: We maintain migration scripts as SQL files with both up and down migrations. For schema changes, we follow a process of: 1) Adding new structures without breaking existing ones; 2) Updating application code to use new structures; 3) Migrating existing data; 4) Removing deprecated structures once all systems are updated.

### Implementation Questions

**Q: How do you generate and verify pseudonyms for anonymous feedback?**  
A: We create pseudonyms by hashing a combination of the user's email and organization ID with SHA-256, then converting part of the hash to a readable format (like "HappyTiger#a1b2c3"). This ensures consistency—the same user always gets the same pseudonym within an organization—while preventing identification across organizations.

**Q: How did you approach testing the encryption functionality?**  
A: We implemented multi-layered testing: 1) Unit tests for each cryptographic function; 2) Integration tests that encrypt and decrypt complete data flows; 3) Cross-browser compatibility tests; 4) Edge case testing including large datasets and invalid inputs; 5) Performance benchmarking to ensure encryption doesn't significantly impact user experience.

### Business and Product Questions

**Q: What sets PollSay apart from other survey tools like SurveyMonkey or Google Forms?**  
A: PollSay differentiates through: 1) True end-to-end encryption for sensitive data; 2) Advanced pseudonymization for anonymous yet consistent feedback; 3) Enterprise-focused features like SSO integration and audit logs; 4) Customizable access controls that work at both application and database levels; 5) Compliance-friendly features designed for regulated industries.

**Q: How does the product balance security with usability?**  
A: We implement a layered security approach where basic features work with minimal friction, while sensitive operations require appropriate verification. We make encryption optional but easy to enable, provide clear security indicators in the UI, offer sensible defaults, and ensure error messages are helpful without revealing sensitive information.
