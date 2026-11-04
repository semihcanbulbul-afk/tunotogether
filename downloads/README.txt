PLAY UNO DESKTOP DOWNLOAD

Canonical public download URL: /download.php

Legacy URL handling
Older deployed pages may request /downloads/Uno-Setup-1.0.0%20(1).exe.
The downloads/.htaccess compatibility rule redirects that stale URL to /download.php.
Upload CPANEL-DOWNLOAD-FIX.zip to public_html and extract it there. The archive adds
downloads/.htaccess and replaces download.php without overwriting the root .htaccess.

Installer placement and validation
The installer expected by the current PHP and Node download handlers is:
  public_html/UnoPlay-Setup-1.0.0.exe

Do not place an executable in this downloads folder to bypass validation.
The handlers reject a known blocked SHA-256. The executable currently in the
development project matches that blocked hash and will return 404 by design.
Replace it only with the authorized, verified installer and update the hash
guard in both Node and PHP after independently validating the replacement.

