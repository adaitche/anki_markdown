# Installation

1. Go into your Anki add-on folder. On macOS it is

```
~/Library/Application\ Support/Anki2/addons21
```

2. Clone this repo
3. Start Anki and in the menu item Tools>Add-ons activate the add-on
   'anki_markdown'
4. Restart Anki
5. Now you should see three new note-types: MD Basic, MD Reversed, MD Cloze
6. Use these to create new cards

# Limitations and Todos

- to paste an image from clipboard, need to switch to visual editor
- Anki auto-converts `<` to `&lt;`. This has no effect on display. But the
  source is annoying to edit
- Anki auto-closes HTML tags, e.g. inserting `<foo>` also auto-inserts `</foo>`
- Cloze deletion in equations and code-blocks don't work
- VIM mode would be great

# Development

Start Anki in develop mode

```bash
ANKI_MARKDOWN_DEVMODE=1 /Applications/Anki.app/Contents/MacOS/anki
```
