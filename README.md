# 🚗 MUSTER BAW SEBN • PPE

> **Smart Wiring & Harness Analysis Platform** — plateforme moderne pour l'analyse des drawings, connecteurs, fils, terminaux et compatibilités.

## 🌐 Live Demo

### 👉 [**Ouvrir MUSTER BAW — Live Demo**](https://ahmedhdhili832-dotcom.github.io/Muster-Baw/)

**GitHub:** [ahmedhdhili832-dotcom/Muster-Baw](https://github.com/ahmedhdhili832-dotcom/Muster-Baw)

Le site est déployé avec **GitHub Pages** et se met à jour automatiquement après les changements sur `main`.

## ✨ Fonctionnalités

- 🧠 Analyseur IA — workflow Computer Vision pour drawings et câblages
- 📄 Drawing Scanner — import PDF / PNG / JPG
- 🔌 Connecteurs — références, pins, cavités et orientation
- 🧵 Wire List — couleur, section, longueur, direction, terminal et contact
- 🧩 Compatibilité — contrôle Wire ↔ Terminal ↔ Connector
- 👨‍🔧 Validation humaine — vérification des résultats IA
- 📦 BOM — préparation de la nomenclature composants
- 📊 Rapports & Historique
- 🧊 Vue 3D du connecteur
- 🌙 Dark / Light Mode
- 📱 Responsive desktop / tablette / mobile
- ⚡ Navigation dynamique SPA

## 🎨 Design System

Identité visuelle **automotive / industrial / AI** avec :

- Bleu électrique `#2563EB`
- Cyan `#38BDF8`
- Violet `#8B5CF6`
- Vert validation `#16A34A`
- Orange warning `#F59E0B`
- Rouge erreur `#DC2626`
- Glassmorphism, gradients et micro-animations
- Support de `prefers-reduced-motion`

## 📁 Structure

```text
Muster-Baw/
├── index.html
├── src/
│   ├── css/
│   │   ├── style.css
│   │   ├── improvements.css
│   │   └── visual-enhancements.css
│   └── js/
│       ├── app.js
│       ├── config.js
│       └── navigation.js
├── assets/
├── config/
│   └── app.config.json
├── .github/
│   └── workflows/
│       └── deploy.yml
├── IMPROVEMENTS.md
└── README.md
```

## 🚀 Développement local

La version actuelle est statique et ne nécessite pas Node.js.

```bash
python -m http.server 8000
```

Puis : `http://localhost:8000`

Avec VS Code, **Live Server** peut également être utilisé pour lancer le projet localement.

## 🌍 Déploiement GitHub Pages

Le workflow `.github/workflows/deploy.yml` publie automatiquement le projet sur GitHub Pages.

**Live Demo :** https://ahmedhdhili832-dotcom.github.io/Muster-Baw/

## 📌 Roadmap

- [x] Dashboard professionnel
- [x] Navigation SPA
- [x] Responsive UI
- [x] Dark / Light Mode
- [x] GitHub Pages Live Demo
- [x] Drawing upload interface
- [ ] OCR / Computer Vision réel
- [ ] Détection réelle des connecteurs
- [ ] Reconstruction automatique des wires
- [ ] Base de données connecteurs / terminaux
- [ ] Export Excel / CSV / PDF complet
- [ ] Backend sécurisé

## 🏭 Vision MUSTER BAW

```text
Drawing
   ↓
Computer Vision / OCR
   ↓
Connecteurs + Pins + Cavités
   ↓
Wires + Couleurs + Sections + Longueurs
   ↓
Terminaux + Contacts
   ↓
Compatibilité
   ↓
Validation humaine
   ↓
Wire List + BOM + Rapport
```

---

**MUSTER BAW SEBN • PPE** — Smart Wiring Analysis Platform  
Dernière mise à jour : Août 2026
