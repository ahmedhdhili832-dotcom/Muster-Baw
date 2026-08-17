/**
 * MUSTER BAW SEBN • PPE
 * Application principale
 * 
 * Architecture modulaire avec:
 * - Gestion d'état centralisée
 * - Patterns asynchrones modernes
 * - Gestion d'erreurs robuste
 * - Performance optimisée
 * - Accessibilité améliorée
 */

"use strict";

// ============================================================
// 01. NAMESPACE APPLICATION
// ============================================================

const MusterBAW = (() => {

    // ========================================================
    // STATE MANAGEMENT
    // ========================================================

    const State = {
        currentPage: "dashboard",
        theme: localStorage.getItem("musterTheme") || "light",
        sidebarOpen: false,
        project: null,
        analysis: {
            status: "ready",
            drawing: null,
            connectors: [],
            wires: [],
            terminals: [],
            errors: [],
            confidence: 0
        },
        cache: new Map()
    };

    // ========================================================
    // CONFIGURATION
    // ========================================================

    const Config = {
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowedFileTypes: ["application/pdf", "image/png", "image/jpeg", "image/jpg"],
        toastDuration: 3500,
        animationDuration: 250,
        pageTitles: {
            dashboard: "Tableau de bord",
            projects: "Gestion des projets",
            "drawing-scanner": "Scanner le Drawing",
            "ai-analyzer": "Analyseur IA",
            "manual-analysis": "Analyse manuelle",
            connectors: "Connecteurs détectés",
            "connector-3d": "Vue 3D Connecteur",
            pinout: "Pinout & Cavités",
            "wire-list": "Wire List",
            "wire-details": "Détails des fils",
            terminals: "Terminaux & Contacts",
            compatibility: "Compatibilité",
            validation: "Validation humaine",
            bom: "Génération BOM",
            reports: "Rapports & Historique",
            database: "Base de données",
            settings: "Paramètres"
        }
    };

    // ========================================================
    // DOM CACHE (lazy loaded)
    // ========================================================

    const DOM = {};

    function getCachedDOM(selector, id) {
        if (!DOM[id]) {
            DOM[id] = document.getElementById(id) || document.querySelector(selector);
        }
        return DOM[id];
    }

    // ========================================================
    // ERROR HANDLING
    // ========================================================

    class AppError extends Error {
        constructor(message, code = "UNKNOWN") {
            super(message);
            this.name = "AppError";
            this.code = code;
            this.timestamp = new Date();
        }
    }

    const Logger = {
        info: (message, data = {}) => {
            console.log(`[INFO] ${message}`, data);
        },
        warn: (message, data = {}) => {
            console.warn(`[WARN] ${message}`, data);
        },
        error: (message, data = {}) => {
            console.error(`[ERROR] ${message}`, data);
            State.analysis.errors.push({
                message,
                timestamp: new Date(),
                ...data
            });
        }
    };

    // ========================================================
    // UTILITY FUNCTIONS
    // ========================================================

    function escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function generateID(prefix = "ID") {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 7).toUpperCase();
        return `${prefix}-${timestamp}-${random}`;
    }

    function debounce(func, delay) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, delay);
        };
    }

    function throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // ========================================================
    // TOAST NOTIFICATIONS
    // ========================================================

    const Toast = {
        show: (message, type = "success") => {
            try {
                const container = getCachedDOM("#toastContainer", "toastContainer");
                if (!container) return;

                const toast = document.createElement("div");
                toast.className = `toast ${type}`;
                toast.setAttribute("role", "alert");
                toast.setAttribute("aria-live", "polite");

                const iconMap = {
                    success: "fa-circle-check",
                    error: "fa-circle-xmark",
                    warning: "fa-triangle-exclamation",
                    info: "fa-circle-info"
                };

                const icon = iconMap[type] || iconMap.info;

                toast.innerHTML = `
                    <i class="fa-solid ${icon}" aria-hidden="true"></i>
                    <span>${escapeHTML(message)}</span>
                `;

                container.appendChild(toast);

                // Trigger animation
                requestAnimationFrame(() => {
                    toast.classList.add("show");
                });

                setTimeout(() => {
                    toast.classList.remove("show");
                    setTimeout(() => toast.remove(), Config.animationDuration);
                }, Config.toastDuration);

            } catch (err) {
                Logger.error("Toast display error", { err });
            }
        }
    };

    // ========================================================
    // FILE VALIDATION
    // ========================================================

    const FileValidator = {
        validate: (file) => {
            if (!file) {
                return { valid: false, message: "Aucun fichier sélectionné." };
            }

            if (!Config.allowedFileTypes.includes(file.type)) {
                return { valid: false, message: "Format non supporté. Utilisez PDF, PNG ou JPG." };
            }

            if (file.size > Config.maxFileSize) {
                return { valid: false, message: `Fichier trop volumineux (max ${Config.maxFileSize / 1024 / 1024}MB).` };
            }

            return { valid: true, message: "Fichier valide." };
        },

        setDrawing: (file) => {
            const validation = FileValidator.validate(file);

            if (!validation.valid) {
                Toast.show(validation.message, "error");
                return false;
            }

            State.analysis.drawing = {
                name: file.name,
                type: file.type,
                size: file.size,
                file: file,
                importedAt: new Date()
            };

            Toast.show(`Drawing "${file.name}" importé avec succès.`, "success");
            return true;
        }
    };

    // ============================================================
    // NAVIGATION SYSTEM
    // ============================================================

    const Navigation = {
        init: () => {
            const navItems = document.querySelectorAll(".nav-item");
            navItems.forEach(item => {
                item.addEventListener("click", () => {
                    const page = item.dataset.page;
                    if (page) Navigation.goTo(page);
                });
            });

            // Page links
            document.querySelectorAll("[data-page-link]").forEach(link => {
                link.addEventListener("click", () => {
                    const page = link.dataset.pageLink;
                    if (page) Navigation.goTo(page);
                });
            });
        },

        goTo: (page) => {
            if (!Config.pageTitles[page]) {
                Logger.warn(`Page inconnue : ${page}`);
                return;
            }

            State.currentPage = page;

            // Update active navigation
            document.querySelectorAll(".nav-item").forEach(item => {
                item.classList.remove("active");
                item.setAttribute("aria-current", "false");
            });

            const activeNav = document.querySelector(`.nav-item[data-page="${page}"]`);
            if (activeNav) {
                activeNav.classList.add("active");
                activeNav.setAttribute("aria-current", "page");
            }

            // Update pages visibility
            document.querySelectorAll(".page").forEach(section => {
                section.classList.remove("active");
                section.setAttribute("hidden", "");
            });

            const targetPage = document.getElementById(`page-${page}`);
            if (targetPage) {
                targetPage.classList.add("active");
                targetPage.removeAttribute("hidden");
            }

            Navigation.updateTitle();
            Sidebar.closeMobile();

            window.scrollTo({ top: 0, behavior: "smooth" });

            // Page-specific initialization
            Navigation.handlePageLoad(page);
        },

        updateTitle: () => {
            const pageTitle = getCachedDOM("#pageTitle", "pageTitle");
            if (!pageTitle) return;
            pageTitle.textContent = Config.pageTitles[State.currentPage] || "MUSTER BAW SEBN";
        },

        handlePageLoad: (page) => {
            switch (page) {
                case "drawing-scanner":
                    Scanner.init();
                    break;
                case "ai-analyzer":
                    Analyzer.init();
                    break;
                case "connectors":
                    Connectors.init();
                    break;
                case "wire-list":
                    WireList.init();
                    break;
                case "settings":
                    Settings.init();
                    break;
                default:
                    Logger.info(`Page ${page} loaded`);
            }
        }
    };

    // ============================================================
    // SIDEBAR MANAGEMENT
    // ============================================================

    const Sidebar = {
        init: () => {
            const mobileMenuBtn = getCachedDOM("#mobileMenuButton", "mobileMenuButton");
            if (mobileMenuBtn) {
                mobileMenuBtn.addEventListener("click", Sidebar.toggleMobile);
            }

            document.addEventListener("click", (e) => {
                if (!State.sidebarOpen) return;
                
                const sidebar = getCachedDOM("#sidebar", "sidebar");
                if (sidebar && !sidebar.contains(e.target) && !mobileMenuBtn?.contains(e.target)) {
                    Sidebar.closeMobile();
                }
            });
        },

        toggleMobile: () => {
            State.sidebarOpen = !State.sidebarOpen;
            const sidebar = getCachedDOM("#sidebar", "sidebar");
            if (sidebar) {
                sidebar.classList.toggle("mobile-open", State.sidebarOpen);
            }
        },

        closeMobile: () => {
            State.sidebarOpen = false;
            const sidebar = getCachedDOM("#sidebar", "sidebar");
            if (sidebar) {
                sidebar.classList.remove("mobile-open");
            }
        }
    };

    // ============================================================
    // THEME MANAGEMENT
    // ============================================================

    const Theme = {
        init: () => {
            Theme.apply(State.theme);
            const themeToggle = getCachedDOM("#themeToggle", "themeToggle");
            if (themeToggle) {
                themeToggle.addEventListener("click", Theme.toggle);
            }
        },

        toggle: () => {
            State.theme = State.theme === "dark" ? "light" : "dark";
            Theme.apply(State.theme);
            localStorage.setItem("musterTheme", State.theme);
            Toast.show(
                State.theme === "dark" ? "Mode sombre activé." : "Mode clair activé.",
                "success"
            );
        },

        apply: (theme) => {
            const body = document.body;
            body.classList.toggle("dark-mode", theme === "dark");
            
            const themeToggle = getCachedDOM("#themeToggle", "themeToggle");
            if (themeToggle) {
                const icon = themeToggle.querySelector("i");
                if (icon) {
                    if (theme === "dark") {
                        icon.className = "fa-solid fa-sun";
                        themeToggle.setAttribute("aria-label", "Activer le mode clair");
                    } else {
                        icon.className = "fa-solid fa-moon";
                        themeToggle.setAttribute("aria-label", "Activer le mode sombre");
                    }
                }
            }
        }
    };

    // ============================================================
    // KEYBOARD SHORTCUTS
    // ============================================================

    const Keyboard = {
        init: () => {
            document.addEventListener("keydown", Keyboard.handleShortcuts);
        },

        handleShortcuts: (e) => {
            // Ctrl+K: Search
            if (e.ctrlKey && e.key.toLowerCase() === "k") {
                e.preventDefault();
                Toast.show("Recherche globale disponible prochainement.", "success");
            }

            // Ctrl+B: Toggle sidebar
            if (e.ctrlKey && e.key.toLowerCase() === "b") {
                e.preventDefault();
                Sidebar.toggleMobile();
            }

            // Escape: Close sidebar
            if (e.key === "Escape") {
                Sidebar.closeMobile();
            }
        }
    };

    // ============================================================
    // PAGE-SPECIFIC MODULES
    // ============================================================

    const Scanner = {
        init: () => {
            Logger.info("Scanner initialized");
        }
    };

    const Analyzer = {
        init: () => {
            Logger.info("Analyzer initialized");
        }
    };

    const Connectors = {
        init: () => {
            Logger.info("Connectors initialized");
        }
    };

    const WireList = {
        init: () => {
            Logger.info("WireList initialized");
        }
    };

    const Settings = {
        init: () => {
            Logger.info("Settings initialized");
        }
    };

    // ============================================================
    // DATA MODELS
    // ============================================================

    const Models = {
        createWire: (data = {}) => ({
            id: data.id || generateID("W"),
            pin: data.pin || null,
            connector: data.connector || null,
            color: data.color || "Non déterminée",
            section: data.section || "Non déterminée",
            length: data.length || null,
            terminal: data.terminal || null,
            contact: data.contact || null,
            direction: data.direction || "Non déterminée",
            confidence: {
                pin: data.confidence?.pin ?? null,
                color: data.confidence?.color ?? null,
                section: data.confidence?.section ?? null,
                length: data.confidence?.length ?? null
            },
            status: data.status || "pending"
        }),

        createConnector: (data = {}) => ({
            id: data.id || generateID("CON"),
            reference: data.reference || "UNKNOWN",
            type: data.type || "Unknown",
            pins: data.pins || 0,
            orientation: data.orientation || "Unknown",
            locking: data.locking ?? null,
            cavities: data.cavities || [],
            confidence: data.confidence || null,
            status: data.status || "pending"
        }),

        createProject: (data = {}) => ({
            id: data.id || generateID("PRJ"),
            name: data.name || "Nouveau projet",
            drawingReference: data.drawingReference || "",
            client: data.client || "SEBN",
            version: data.version || "V1",
            createdAt: new Date(),
            status: "draft"
        })
    };

    // ============================================================
    // EXPORT / IMPORT
    // ============================================================

    const DataExport = {
        exportJSON: (data, filename = "muster-baw-data.json") => {
            try {
                const json = JSON.stringify(data, null, 4);
                const blob = new Blob([json], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(url);
                Toast.show("Données exportées avec succès.", "success");
            } catch (err) {
                Logger.error("Export failed", { err });
                Toast.show("Erreur lors de l'export.", "error");
            }
        },

        print: () => {
            window.print();
        }
    };

    // ============================================================
    // PUBLIC API
    // ============================================================

    return {
        init: () => {
            document.addEventListener("DOMContentLoaded", () => {
                try {
                    Sidebar.init();
                    Theme.init();
                    Navigation.init();
                    Keyboard.init();
                    Navigation.updateTitle();
                    Logger.info("MUSTER BAW SEBN • PPE initialized successfully");
                } catch (err) {
                    Logger.error("Initialization failed", { err });
                    Toast.show("Erreur lors de l'initialisation de l'application.", "error");
                }
            });
        },

        // Public methods
        State,
        Config,
        Logger,
        Toast,
        FileValidator,
        Navigation,
        Theme,
        Models,
        DataExport
    };

})();

// ============================================================
// BOOTSTRAP APPLICATION
// ============================================================

MusterBAW.init();
