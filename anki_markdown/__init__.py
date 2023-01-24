from aqt import gui_hooks, mw
from importlib import resources
from pathlib import Path
import os

DEVMODE = os.getenv("ANKI_MARKDOWN_DEVMODE", "").lower() in ("true", "1")
FILENAME_PREFIX = "_anki_markdown_"
NOTE_TYPE_PREFIX = "MD "
PREVIEW_ELEMENT_ID = "anki_markdown_preview"
SCRIPT = f'<script src="{FILENAME_PREFIX}main.js" onload="amd.render()"></script>'
FRONT, BACK, CLOZE, EXTRA = [
    '<div class="markdown">{{' + x + "}}</div>"
    for x in ("Front", "Back", "cloze:Text", "Extra")
]
CSS = resources.read_text(__package__, "main.css")


NOTE_TYPES = {
    "Basic": {
        "fields": ["Front", "Back"],
        "templates": {
            "Card1": {
                "qfmt": "\n".join((FRONT, SCRIPT)),
                "afmt": "\n".join((FRONT, "<hr id=answer>", BACK, SCRIPT)),
            }
        },
        "css": CSS,
    },
    "Reversed": {
        "fields": ["Front", "Back"],
        "templates": {
            "Card1": {
                "qfmt": "\n".join((FRONT, SCRIPT)),
                "afmt": "\n".join((FRONT, "<hr id=answer>", BACK, SCRIPT)),
            },
            "Card2": {
                "qfmt": "\n".join((BACK, SCRIPT)),
                "afmt": "\n".join((BACK, "<hr id=answer>", FRONT, SCRIPT)),
            },
        },
        "css": CSS,
    },
    "Cloze": {
        "fields": ["Text", "Extra"],
        "is_cloze": True,
        "templates": {
            "Cloze": {
                "qfmt": "\n".join((CLOZE, SCRIPT)),
                "afmt": "\n".join((CLOZE, "<hr id=answer>", EXTRA, SCRIPT)),
            }
        },
        "css": CSS,
    },
}


def log(msg):
    print("anki_markdown:", msg)


def create_notetypes():
    M = mw.col.models

    for nt_name, nt_spec in NOTE_TYPES.items():
        notetype = M.by_name(NOTE_TYPE_PREFIX + nt_name)
        is_new = False

        if not notetype:
            is_new = True
            notetype = M.new(NOTE_TYPE_PREFIX + nt_name)

            for field_name in nt_spec["fields"]:
                M.add_field(notetype, M.new_field(field_name))

            for t_name in nt_spec["templates"]:
                M.add_template(notetype, M.new_template(t_name))

            if nt_spec.get("is_cloze"):
                notetype["type"] = 1

        assert len(notetype["tmpls"]) == len(nt_spec["templates"]), notetype["tmpls"]

        for template, (t_name, t_spec) in zip(
            notetype["tmpls"], nt_spec["templates"].items()
        ):
            template["name"] = t_name
            template["qfmt"] = t_spec["qfmt"]
            template["afmt"] = t_spec["afmt"]

        for field in notetype["flds"]:
            field["plainText"] = True

        notetype["css"] = nt_spec["css"]

        if is_new:
            M.add_dict(notetype)
            log(f"Adding notetype {nt_name}")
        else:
            log(f"Updating notetype {nt_name}")
            M.update_dict(notetype)


def copy_resources(filenames):
    media_dir = Path(mw.col.media.dir())
    resources_to_delete = set(media_dir.glob(FILENAME_PREFIX + "*"))

    for filename in filenames:
        source = Path(__file__).parent / filename
        target = media_dir.joinpath(FILENAME_PREFIX + filename)
        resources_to_delete.discard(target)

        if DEVMODE:
            if target.exists():
                target.unlink()

            target.symlink_to(source)
            log(f"Created link {target}")
        else:
            if target.is_symlink():
                target.unlink()

            if (
                target.exists()
                and target.stat().st_mtime >= source.stat().st_mtime
                and target.stat().st_size == source.stat().st_size
            ):
                continue

            log(f"Creating/updating {target}")
            target.write_bytes(source.read_bytes())

    for target in resources_to_delete:
        log(f"Removing obsolete resource {target}")
        target.unlink()


def setup():
    copy_resources(
        [
            "highlight.css",
            "highlight.js",
            "markdown-it.min.js",
            "mermaid.min.js",
            "main.js",
        ]
    )
    create_notetypes()


def add_preview(js, note, _):
    do_preview = False
    nt = note.note_type()

    for template in nt["tmpls"]:
        if SCRIPT in template["qfmt"] or SCRIPT in template["afmt"]:
            do_preview = True
            break

    if not do_preview:
        remove_cmd = f"document.querySelectorAll('#{PREVIEW_ELEMENT_ID}').forEach(el => el.remove());"
        return js + remove_cmd

    # import pdb; pdb.set_trace()
    css = nt["css"]

    js += f"""
        const style = document.createElement("style")
        style.textContent = `{css}`;
        document.head.appendChild(style);

        const script = document.createElement("script");
        script.onload = function () {{
          amd.addPreview({PREVIEW_ELEMENT_ID!r});
        }};
        script.src = "{FILENAME_PREFIX}main.js";
        document.head.appendChild(script);
    """
    return js


gui_hooks.profile_did_open.append(setup)
gui_hooks.editor_will_load_note.append(add_preview)
