Web/PWA launcher icon setup

HTML <head>:

    <link rel="icon" type="image/png" href="/launcher-icon-20260906.png">
    <link rel="shortcut icon" type="image/png" href="/launcher-icon-20260906.png">
    <link rel="apple-touch-icon" href="/launcher-icon-20260906.png">

Manifest:

    {
      "icons": [
        {
          "src": "/launcher-icon-20260906.png",
          "type": "image/png",
          "sizes": "512x512",
          "purpose": "any"
        }
      ]
    }

The launcher file is copied from src/assets/mascot.png. Legacy IconKitchen web/PWA icon files are intentionally removed.
