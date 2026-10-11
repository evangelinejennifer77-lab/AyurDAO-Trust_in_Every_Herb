# Ledgerstamp + FreeOTP MFA

## What changed
- Removed email/SMS OTP delivery from the authentication flow.
- Added RFC-compatible TOTP generation and verification on the Node server.
- FreeOTP is used on the user's phone to display the 6-digit code.
- First sign-in shows a QR code and a manual setup key. The user scans it in FreeOTP.
- Subsequent sign-ins only require the current 6-digit FreeOTP code.
- Admin 2 uses the same FreeOTP flow for dual-admin approval.
- TOTP secrets are encrypted at rest using `MFA_SECRET_KEY`.
- Verification accepts a small clock-skew window and limits failed attempts.
- Login page was redesigned with a clean government/enterprise-inspired theme.

## Run
1. Copy `.env.example` to `.env`.
2. Set `MFA_SECRET_KEY` to a long random value.
3. Run `npm install`.
4. Run `npm start`.
5. Open `http://localhost:3000/Ledgerstamp_Gov_MFA.html`.

## FreeOTP enrollment
On first login, after the password is accepted:
1. Open FreeOTP on the user's phone.
2. Add an account / scan the QR code shown by Ledgerstamp.
3. Enter the 6-digit code currently shown by FreeOTP.
4. Future logins use password + FreeOTP code.

FreeOTP does not send an SMS. It generates the code locally on the phone.

## Important prototype note
The demo identities and password hashes are still defined in the HTML prototype. For production, move identities, password verification, roles, sessions, and audit data to a backend/database and use secure HTTP-only session cookies.
