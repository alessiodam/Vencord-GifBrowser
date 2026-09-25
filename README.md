# GifBrowser

A [Vencord](https://github.com/Vendicated/Vencord) user plugin that gives you a big, keyboard-driven GIF browser instead of Discord's tiny GIF picker.

- **Favorites, Recent and Klipy** views in a masonry grid that shows every GIF uncropped: your favorite GIFs, the GIFs you recently sent from the browser, and Klipy trending / search (Discord's GIF provider), with search suggestions and trending categories
- **Instant search**: favorites and recent GIFs filter as you type (by link, and by tag with GifTags)
- **Keyboard-driven**: type to search, arrow keys to move, `Enter` to send, `Shift+Enter` to insert the link, `Ctrl+Enter` to send and keep the browser open, `Tab` to switch views, `Ctrl+S` to favorite
- **Tag support**: with the [GifTags](https://github.com/alessiodam/Vencord-GifTags) plugin enabled, filter by tags in the sidebar, see tags on each GIF, and tag GIFs (or many at once with **Select**) by right-clicking. Tagging a Klipy result also favorites it
- **Size slider** for bigger previews or more GIFs per row
- **Synced**: recently sent GIFs and all settings are stored in your Vencord settings, so Vencord Cloud sync carries them between clients. Clear the recent list with **Clear recent** in the Recent view
- **Open it your way** (plugin settings): a chat bar button, a keyboard shortcut (default `Ctrl+Shift+G`), and/or replacing Discord's own GIF picker (GIF button and `Ctrl+G`)

## Installation

User plugins require a [Vencord build from source](https://docs.vencord.dev/installing/).

```sh
cd Vencord/src/userplugins
git clone https://github.com/alessiodam/Vencord-GifBrowser gifBrowser
cd ../..
pnpm build
pnpm inject
```

Then enable **GifBrowser** in Settings → Vencord → Plugins. For tags, also install and enable GifTags.
