# STOK REAL - Bluetooth Thermal Printer v2

This patch removes the broken `@devlas/capacitor-thermal-printer` integration and replaces it with
`@aybinv7/capacitor-thermal-printer` 0.2.8.

Why:
- The previous plugin caused Gradle failure because it required
  `com.github.mik3y:usb-serial-for-android:3.11.0`, which the build could not resolve.
- The replacement is a current Bluetooth ESC/POS Capacitor plugin and is published with 0 npm dependencies.

## Files
1. `package.json` - replace the project package.json with this version.
2. `src/printer.js` - add this file.
3. `index.html` - add this line immediately before `</body>`:
   `<script type="module" src="/src/printer.js"></script>`

## Important
Do NOT keep `@devlas/capacitor-thermal-printer` in package.json.
Do NOT keep the old `src/printer.js` from the previous patch.

Then commit/push the changes and run GitHub Actions -> Build APK.

Existing PDF/XLSX/CSV/Bagikan features are not intentionally changed.
