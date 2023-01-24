// TODO: explain how things work
"use strict";
var amd;

if (!amd) {
  console.log("anki_markdown: initialising amd object");

  amd = {
    injected: {},

    get_path(filename) {
      return "_anki_markdown_" + filename;
    },

    inject(path, prefix_path = true) {
      if (prefix_path) {
        path = this.get_path(path);
      }

      return new Promise((resolve, reject) => {
        if (path in this.injected) {
          resolve();
          return;
        }

        let el;

        if (path.endsWith(".js")) {
          el = document.createElement("script");
          el.onload = resolve;
          el.onerror = reject;
          el.src = path;
        } else if (path.endsWith(".css")) {
          el = document.createElement("link");
          el.onload = resolve;
          el.onerror = reject;
          el.href = path;
          el.setAttribute("rel", "stylesheet");
          el.type = "text/css";
        } else {
          console.log("anki_markdown: unexpected file ending in " + path);
          reject();
          return;
        }

        document.head.appendChild(el);
        this.injected[path] = true;
      });
    },

    initMarkdownIt: async function () {
      this.inject("highlight.css");
      await Promise.all([
        this.inject("highlight.js"),
        this.inject("markdown-it.min.js"),
      ]);

      if (!this.markdownItInstance) {
        const md = new markdownit({
          typographer: true,
          html: true,
          highlight: function (str, lang) {
            if (lang && hljs.getLanguage(lang)) {
              try {
                return hljs.highlight(str, { language: lang }).value;
              } catch (__) {}
            }

            return ""; // use external default escaping
          },
        });

        // special rule for treating Marmaid fenced blocks
        const temp = md.renderer.rules.fence.bind(md.renderer.rules);
        md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
          const token = tokens[idx];
          const code = token.content.trim();
          if (token.info === "mermaid") {
            return `<div class="mermaid">${code}</div>`;
          }
          return temp(tokens, idx, options, env, slf);
        };
        this.markdownItInstance = md;
      }
    },

    initMermaid: async function () {
      await this.inject("mermaid.min.js");

      if (!this.mermaidInitialized) {
        mermaid.initialize({ startOnLoad: false });
        this.mermaidInitialized = true;
      }
    },

    /**
     * Make MathJax also accept $ for inline math and $$ for block math. Using
     * the defaults \( and \[ leads to problems, as Anki replaces them with
     * HTML tags.
     */
    adjustMathJax() {
      if (!this.didAdjustMathJax) {
        MathJax.config.tex.inlineMath = [
          ["$", "$"],
          ["\\(", "\\)"],
        ];
        MathJax.config.tex.displayMath = [
          ["$$", "$$"],
          ["\\[", "\\]"],
        ];
        MathJax.config.tex["macros"] = {
          d: ["{\\mathop{}\\!\\!\\mathrm{d}#1\\,}", 1],
          P: ["{\\mathbb{P}\\!\\left[#1 \\right]}", 1],
          PP: ["{\\mathbb{P}\\!\\left[#1\\middle| #2 \\right]}", 2],
        };
        // TODO: The code below doesn't seem to help. Need to debug futher,
        // the font is loaded here: https://github.com/ankitects/anki/blob/96a9dba67d4021ac8dda113eea617d0bc7fbf7e8/build/configure/src/web.rs#L532
        //
        // MathJax.loader = {
        //   load: [
        //     "[tex]noerrors",
        //     "[tex]mathtools",
        //     "[tex]mhchem",
        //     "[tex]boldsymbol",
        //   ],
        //   paths: {
        //     mathjax: "/_anki/js/vendor/mathjax",
        //   },
        // };
        MathJax.startup.getComponents();
        this.didAdjustMathJax = true;
      }
    },

    initialSetup: async function () {
      const promises = Promise.all([this.initMarkdownIt(), this.initMermaid()]);
      this.adjustMathJax();
      await promises;
    },

    render: async function () {
      await this.initialSetup();

      for (const el of document.querySelectorAll(".markdown")) {
        MathJax.typeset([el]);

        // workaround for Anki auto-converting < to &lt;
        // if we don't do the replacement &lt; will be shown in code blocks
        const text = el.innerHTML.replace(/&lt;/g, "<").replace(/&gt;/g, ">");

        el.innerHTML = this.markdownItInstance.render(text);
        el.classList.remove("markdown");
        mermaid.init(undefined, el.querySelectorAll(".mermaid"));
      }
    },

    addPreview(previewID, fieldNames = []) {
      const update = this.updatePreview.bind(this);

      if (!document.getElementById(previewID)) {
        const preview = document.createElement("div");
        preview.id = previewID;
        preview.style.backgroundColor = "white";
        // preview.style.overflowY = "auto";
        preview.style.padding = "1em 1em 0 1em";
        preview.style.margin = "0.5em 0";
        preview.style.border = "1px solid #999";
        preview.style.borderRadius = "5px";
        this.preview = preview;

        document.querySelector(".fields-editor>.fields").appendChild(preview);
        document.addEventListener("keyup", update);
      }

      this.preview.fieldNames = fieldNames;
      setTimeout(update, 100);
    },

    updatePreview: async function () {
      var markdownTexts = [];
      document
        .querySelectorAll(".plain-text-input .CodeMirror")
        .forEach((editor, idx) => {
          const content = editor.CodeMirror.getValue();
          markdownTexts.push(content);
          editor.CodeMirror.setOption("lineNumbers", false);
        });

      this.preview.classList.add("markdown");
      this.preview.innerHTML = markdownTexts.join("\n\n---\n\n");
      amd.render();
    },

    enableHTMLEditor() {
      document
        .querySelectorAll(".plain-text-input .CodeMirror")
        .forEach((editor, idx) => {
          editor.CodeMirror.setOption("lineNumbers", false);
        });

      // This approach is pretty brittle :'(
      for (const el of document.querySelectorAll(
        "span[title*='Toggle Visual Editor']"
      )) {
        if (el.querySelector("svg#mdi-eye-outline")) {
          // disable Visual editor
          el.click();

          // enable HTML editor
          el.parentElement.parentElement.nextElementSibling.click();
        }
      }
    },

    convertHTMLtoText() {
      document
        .querySelectorAll(".plain-text-input .CodeMirror")
        .forEach((editor, idx) => {
          editor.CodeMirror.setValue(
            this.replaceHTMLElements(editor.CodeMirror.getValue())
          );
        });
    },

    replaceHTMLElements(str) {
      return str
        .replace(/&nbsp;/gi, " ")
        .replace(/&tab;/gi, "   ")
        .replace(/&gt;/gi, ">")
        .replace(/&lt;/gi, "<")
        .replace(/\n/gi, "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/&amp;/gi, "&");
      // TODO: include div?
    },
  };
}
