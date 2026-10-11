# AyurDAO — Enterprise Identity, Access & Asset Governance Portal

AyurDAO is an enterprise and government-grade decentralized identity, role-based access management, and asset governance portal with RFC-compliant FreeOTP / TOTP Multi-Factor Authentication (MFA).

---

## 🌟 Key Features

- **Government & Enterprise UI**: High-contrast, accessible, and prestigious interface tailored for institutional administration and audit compliance.
- **Hardware & Software Token MFA (FreeOTP / Google Authenticator)**: RFC-compliant TOTP generation and verification powered by an Express backend.
- **Zero-SMS / Offline TOTP**: Generates authentication codes completely offline directly on mobile authenticators (FreeOTP).
- **Dual-Admin Governance**: Built-in multi-signature and dual-administrator approvals for critical operations.
- **Secure Secret Encryption**: TOTP secrets are encrypted at rest with AES cryptographic standards using `MFA_SECRET_KEY`.
- **Clock Skew Tolerance & Rate Limiting**: Intelligent time-drift verification window and brute-force protection against unauthorized attempts.

---

## 📁 Project Structure

```text
├── AyurDAO_Gov_MFA.html    # Main AyurDAO Identity & Governance Portal
├── Ledgerstamp_Gov_MFA.html# Ledgerstamp Unified Governance UI
├── server_freeotp.js       # Node.js backend for FreeOTP / TOTP validation
├── package.json            # Dependencies and scripts
├── .env.example            # Environment variable template
├── run.ps1                 # One-click startup script (PowerShell)
├── start.bat               # One-click startup script (Batch)
└── README.md               # Documentation
```

---

## 🚀 Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- [FreeOTP Authenticator](https://freeotp.github.io/) installed on your mobile device (or Google Authenticator)

### 2. Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/evangelinejennifer77-lab/AYURDAO-.git
cd AYURDAO-
npm install
```

### 3. Environment Configuration
Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Configure your `.env`:
```env
PORT=3000
MFA_SECRET_KEY=your-secure-random-32-byte-secret-key
```

### 4. Running the Application

You can launch using the provided scripts or via npm:

**Using npm:**
```bash
npm start
```

**On Windows:**
Double-click `start.bat` or run in PowerShell:
```powershell
.\run.ps1
```

Once running, navigate to:
```
http://localhost:3000/AyurDAO_Gov_MFA.html
```

---

## 🔐 FreeOTP Enrollment Workflow

1. Navigate to the portal and enter the demo user credentials.
2. Upon first login, a QR code and base32 secret key are presented.
3. Open **FreeOTP** on your mobile phone and tap **+** to scan the QR code.
4. Enter the 6-digit TOTP code currently shown on your device to finalize enrollment.
5. All subsequent sign-ins seamlessly authenticate using your password and live FreeOTP code.

---

## 🛡️ License
Private / Proprietary. All rights reserved.
