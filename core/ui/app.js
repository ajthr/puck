/**
 * Puck Dashboard Application
 *
 * Manages configuration state, renders UI controls, and maintains
 * a live YAML preview that updates in real-time.
 */

(function () {
    "use strict";

    // ── State ──

    let config = null;
    let connected = false;

    // ── Theme ──

    const THEME_KEY = "puck-theme";

    function getSystemTheme() {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    }

    function applyTheme(theme) {
        const resolved = theme === "system" ? getSystemTheme() : theme;
        document.documentElement.setAttribute("data-theme", resolved);
        localStorage.setItem(THEME_KEY, theme);

        document.querySelectorAll(".theme-btn").forEach(function (btn) {
            btn.classList.toggle("active", btn.dataset.theme === theme);
        });
    }

    function initTheme() {
        const saved = localStorage.getItem(THEME_KEY) || "system";
        applyTheme(saved);

        document.querySelectorAll(".theme-btn").forEach(function (btn) {
            btn.addEventListener("click", function () {
                applyTheme(btn.dataset.theme);
            });
        });

        window
            .matchMedia("(prefers-color-scheme: dark)")
            .addEventListener("change", function () {
                var current = localStorage.getItem(THEME_KEY) || "system";
                if (current === "system") {
                    applyTheme("system");
                }
            });
    }

    // ── API ──

    async function fetchHealth() {
        try {
            const res = await fetch("/api/health");
            const data = await res.json();
            connected = data.status === "ok";
        } catch (e) {
            connected = false;
        }
        renderStatus();
    }

    async function fetchConfig() {
        try {
            const res = await fetch("/api/config");
            config = await res.json();
            render();
            // Populate project fields
            document.getElementById("project-name").value = config.project.name || "";
            document.getElementById("project-path").value = config.project.path || "";
        } catch (e) {
            console.error("Failed to load config:", e);
        }
    }

    async function saveConfig() {
        if (!config) return;
        
        const badge = document.getElementById("status-badge");
        const originalHTML = badge.innerHTML;
        const originalClass = badge.className;
        
        try {
            badge.innerHTML = '<span class="badge-dot"></span>Saving...';
            badge.className = "badge";

            await fetch("/api/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config),
            });
            
            // After saving config, refresh YAML preview from server
            await renderYAML();
            
            badge.innerHTML = '<span class="badge-dot"></span>Saved';
            badge.className = "badge badge-ok";
            
            setTimeout(() => {
                renderStatus();
            }, 2000);
        } catch (e) {
            console.error("Failed to save config:", e);
            badge.innerHTML = '<span class="badge-dot"></span>Save Failed';
            badge.className = "badge badge-error";
            setTimeout(() => {
                renderStatus();
            }, 3000);
        }
    }

    // ── Rendering: Status ──

    function renderStatus() {
        const badge = document.getElementById("status-badge");
        if (!badge) return;

        if (connected) {
            badge.className = "badge badge-ok";
            badge.innerHTML =
                '<span class="badge-dot"></span>Connected';
        } else {
            badge.className = "badge badge-error";
            badge.innerHTML =
                '<span class="badge-dot"></span>Disconnected';
        }
    }

    // ── Rendering: Tools ──

    function renderTools() {
        const dropdown = document.getElementById("tool-dropdown");
        const selectedContainer = document.getElementById("selected-tools");
        if (!dropdown || !selectedContainer || !config) return;

        // Render Dropdown
        const currentSelection = dropdown.value;
        dropdown.innerHTML = '<option value="" disabled selected>Add a tool...</option>';
        
        config.tools.forEach((tool) => {
            if (!tool.enabled) {
                const opt = document.createElement("option");
                opt.value = tool.name;
                opt.textContent = tool.name;
                dropdown.appendChild(opt);
            }
        });

        // Render Selected Tools
        selectedContainer.innerHTML = "";
        config.tools.forEach((tool, i) => {
            if (tool.enabled) {
                const card = document.createElement("div");
                card.className = "selected-tool-card";
                card.innerHTML = `
                    <div class="selected-tool-info">
                        <span class="selected-tool-name">${escapeHtml(tool.name)}</span>
                    </div>
                    <button class="btn btn-sm btn-danger" title="Remove tool">Remove</button>
                `;
                
                card.querySelector("button").addEventListener("click", () => {
                    config.tools[i].enabled = false;
                    onConfigChanged();
                });
                
                selectedContainer.appendChild(card);
            }
        });
    }

    function initToolSelector() {
        const dropdown = document.getElementById("tool-dropdown");
        if (!dropdown) return;

        dropdown.addEventListener("change", () => {
            const toolName = dropdown.value;
            if (!toolName) return;

            const toolIndex = config.tools.findIndex(t => t.name === toolName);
            if (toolIndex !== -1) {
                config.tools[toolIndex].enabled = true;
                dropdown.value = ""; // Reset dropdown
                onConfigChanged();
            }
        });
    }

    // ── Rendering: Branch Rules ──

    function renderBranchRules() {
        const container = document.getElementById("branch-list");
        if (!container || !config) return;

        container.innerHTML = "";

        config.branch_rules.forEach((rule, ruleIndex) => {
            const card = document.createElement("div");
            card.className = "branch-card";

            // Header
            const header = document.createElement("div");
            header.className = "branch-header";
            header.innerHTML = `
                <span class="branch-name">${escapeHtml(rule.branch)}</span>
                <button class="btn btn-sm btn-danger" data-action="remove-branch">Remove</button>
            `;

            header.querySelector("[data-action=remove-branch]").addEventListener(
                "click",
                () => {
                    config.branch_rules.splice(ruleIndex, 1);
                    onConfigChanged();
                }
            );

            // Body
            const body = document.createElement("div");
            body.className = "branch-body";

            // Triggers
            const triggerSection = document.createElement("div");
            const allTriggers = ["push", "pull_request"];

            triggerSection.innerHTML = `
                <div class="branch-field-label">Triggers</div>
                <div class="tag-list" data-role="triggers"></div>
            `;

            const triggerList = triggerSection.querySelector("[data-role=triggers]");

            allTriggers.forEach((trigger) => {
                const isSelected = rule.triggers.indexOf(trigger) !== -1;
                const tag = document.createElement("span");
                tag.className = `tag${isSelected ? " selected" : ""}`;
                tag.textContent = trigger;
                tag.addEventListener("click", () => {
                    const idx = rule.triggers.indexOf(trigger);
                    if (idx === -1) {
                        rule.triggers.push(trigger);
                    } else {
                        rule.triggers.splice(idx, 1);
                    }
                    onConfigChanged();
                });
                triggerList.appendChild(tag);
            });

            // Tools
            const toolSection = document.createElement("div");
            const enabledTools = config.tools.filter((t) => t.enabled);

            toolSection.innerHTML = `
                <div class="branch-field-label">Tools</div>
                <div class="tag-list" data-role="tools"></div>
            `;

            const toolList = toolSection.querySelector("[data-role=tools]");

            if (enabledTools.length === 0) {
                const emptyMsg = document.createElement("span");
                emptyMsg.className = "tool-desc";
                emptyMsg.textContent = "Enable tools above to assign them.";
                toolList.appendChild(emptyMsg);
            } else {
                enabledTools.forEach((tool) => {
                    const isAssigned = rule.tools.indexOf(tool.name) !== -1;
                    const tag = document.createElement("span");
                    tag.className = `tag${isAssigned ? " selected" : ""}`;
                    tag.textContent = tool.name;
                    tag.addEventListener("click", () => {
                        const idx = rule.tools.indexOf(tool.name);
                        if (idx === -1) {
                            rule.tools.push(tool.name);
                        } else {
                            rule.tools.splice(idx, 1);
                        }
                        onConfigChanged();
                    });
                    toolList.appendChild(tag);
                });
            }

            body.appendChild(triggerSection);
            body.appendChild(toolSection);
            card.appendChild(header);
            card.appendChild(body);
            container.appendChild(card);
        });
    }

    // ── Rendering: Add Branch ──

    function initAddBranch() {
        const btn = document.getElementById("add-branch-btn");
        const input = document.getElementById("new-branch-input");
        if (!btn || !input) return;

        btn.addEventListener("click", () => {
            const name = input.value.trim();
            if (!name) return;

            const exists = config.branch_rules.some((r) => r.branch === name);
            if (exists) return;

            config.branch_rules.push({
                branch: name,
                triggers: ["push"],
                tools: [],
            });

            input.value = "";
            onConfigChanged();
        });

        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                btn.click();
            }
        });
    }

    // ── Rendering: Project Settings ──

    function initProjectSettings() {
        const nameInput = document.getElementById("project-name");
        const pathInput = document.getElementById("project-path");

        if (!nameInput || !pathInput) return;

        const updateProject = () => {
            if (!config) return;
            config.project.name = nameInput.value;
            config.project.path = pathInput.value;
            onConfigChanged();
        };

        nameInput.addEventListener("input", updateProject);
        pathInput.addEventListener("input", updateProject);
    }

    // ── Rendering: Deploy ──

    function initDeploy() {
        const btn = document.getElementById("deploy-btn");
        if (!btn) return;

        btn.addEventListener("click", async () => {
            const originalText = btn.textContent;
            try {
                btn.disabled = true;
                btn.textContent = "Deploying...";

                const res = await fetch("/api/deploy", { method: "POST" });
                const data = await res.json();

                if (res.ok) {
                    btn.textContent = "Deployed!";
                    btn.classList.add("btn-success"); // Assuming we might have this class
                } else {
                    throw new Error(data.error || "Failed to deploy");
                }
            } catch (e) {
                console.error("Deployment failed:", e);
                btn.textContent = "Error!";
            } finally {
                setTimeout(() => {
                    btn.disabled = false;
                    btn.textContent = originalText;
                    btn.classList.remove("btn-success");
                }, 2000);
            }
        });
    }

    // ── Rendering: YAML Preview ──

    async function renderYAML() {
        const container = document.getElementById("yaml-output");
        if (!container) return;

        try {
            const res = await fetch("/api/config/yaml");
            const yaml = await res.text();
            container.innerHTML = highlightYAML(yaml);
        } catch (e) {
            console.error("Failed to fetch YAML:", e);
        }
    }

    function highlightYAML(yaml) {
        return yaml
            .split("\n")
            .map((line) => {
                // Comment
                if (/^\s*#/.test(line)) {
                    return `<span class="yaml-comment">${escapeHtml(line)}</span>`;
                }
                // Key: value
                if (/:/.test(line) && !/^\s*-/.test(line)) {
                    const parts = line.match(/^(\s*)([\w_]+)(:)(.*)/);
                    if (parts) {
                        const indent = parts[1];
                        const key = parts[2];
                        const colon = parts[3];
                        const value = parts[4];
                        return (
                            indent +
                            `<span class="yaml-key">${escapeHtml(key)}</span>` +
                            `<span class="yaml-punctuation">${colon}</span>` +
                            highlightValue(value)
                        );
                    }
                }
                // List item with key
                if (/^\s*-\s+\w+:/.test(line)) {
                    const parts = line.match(/^(\s*-\s+)([\w_]+)(:)(.*)/);
                    if (parts) {
                        return (
                            parts[1] +
                            `<span class="yaml-key">${escapeHtml(parts[2])}</span>` +
                            `<span class="yaml-punctuation">${parts[3]}</span>` +
                            highlightValue(parts[4])
                        );
                    }
                }
                // List item string
                if (/^\s*-\s+"/.test(line)) {
                    const parts = line.match(/^(\s*-\s+)(.*)/);
                    if (parts) {
                        return parts[1] + highlightValue(parts[2]);
                    }
                }
                return escapeHtml(line);
            })
            .join("\n");
    }

    function highlightValue(value) {
        const trimmed = value.trim();
        if (trimmed === "true") {
            return ' <span class="yaml-bool-true">true</span>';
        }
        if (trimmed === "false") {
            return ' <span class="yaml-bool-false">false</span>';
        }
        if (/^".*"$/.test(trimmed)) {
            return ` <span class="yaml-string">${escapeHtml(trimmed)}</span>`;
        }
        if (trimmed === "[]") {
            return ' <span class="yaml-punctuation">[]</span>';
        }
        return escapeHtml(value);
    }

    // ── Helpers ──

    function escapeHtml(str) {
        const div = document.createElement("div");
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    let saveTimeout = null;
    function onConfigChanged() {
        render();
        
        // Debounce saves
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            saveConfig();
        }, 500);
    }

    function render() {
        renderTools();
        renderBranchRules();
    }

    // ── Init ──

    document.addEventListener("DOMContentLoaded", () => {
        initTheme();
        initAddBranch();
        initProjectSettings();
        initToolSelector();
        initDeploy();
        fetchHealth();
        fetchConfig();
        renderYAML();
    });
})();
