/* Central application configuration. */
export const APP_CONFIG = {
  name: "MUSTER BAW SEBN • PPE",
  version: "1.0.0",
  storageKey: "musterTheme",
  maxFileSize: 50 * 1024 * 1024,
  allowedFileTypes: ["application/pdf", "image/png", "image/jpeg", "image/jpg"],
  toastDuration: 3500,
  animationDuration: 250,
  pages: {
    dashboard: "Tableau de bord", projects: "Gestion des projets", "drawing-scanner": "Scanner le Drawing",
    "ai-analyzer": "Analyseur IA", "manual-analysis": "Analyse manuelle", connectors: "Connecteurs détectés",
    "connector-3d": "Vue 3D Connecteur", pinout: "Pinout & Cavités", "wire-list": "Wire List",
    "wire-details": "Détails des fils", terminals: "Terminaux & Contacts", compatibility: "Compatibilité",
    validation: "Validation humaine", bom: "Génération BOM", reports: "Rapports & Historique",
    database: "Base de données", settings: "Paramètres"
  }
};
