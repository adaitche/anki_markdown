# Supported Anki Versions

- 2.1.56

# Installation

1. Clone this repo to some directory
   ```bash
   cd <some-dir>
   git clone https://github.com/adaitche/anki_markdown.git
   ```
2. Link plugin into your Anki add-on folder
   ```bash
   # assuming you are still in <some-dir>
   ln -s $PWD/anki_markdown ~/Library/Application\ Support/Anki2/addons21
   ```
3. Start Anki and ensure that under Tools>Add-ons the add-on 'anki_markdown' is
   enabled
4. Restart Anki
5. Now you should see three new note-types: MD Basic, MD Reversed, MD Cloze. Use
   these to create new cards

# Limitations and Todos

- to paste an image from clipboard, need to switch to visual editor
- Anki auto-converts `<` to `&lt;`. This has no effect on display. But the
  source is annoying to edit
- Anki auto-closes HTML tags, e.g. inserting `<foo>` also auto-inserts `</foo>`
- Cloze deletion in equations and code-blocks don't work
- VIM mode would be great
- `\boldsymbol{x}` doesn't work, has something todo with font-loading (which
  does however work when using Anki's way)

# Development

Start Anki in develop mode

```bash
ANKI_MARKDOWN_DEVMODE=1 /Applications/Anki.app/Contents/MacOS/anki
```
