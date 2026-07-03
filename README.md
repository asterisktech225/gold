# 📺 IPTV Player

Application Next.js fullstack monolithe — Xtream Codes compatible.

## 🚀 Démarrage rapide

```bash
# 1. Aller dans le dossier
cd iptv-app

# 2. Installer les dépendances
npm install

# 3. Copier et configurer les variables d'environnement
cp .env.example .env.local
# Éditez .env.local et changez JWT_SECRET

# 4. Lancer en développement
npm run dev
```

L'app sera disponible sur **http://localhost:3000**

## 🗂 Structure
```
app/
  api/          → Routes API proxy (Live, Films, Séries, EPG, Favoris, Auth)
  (app)/        → Pages protégées (Live TV, Films, Séries, Favoris)
  login/        → Page de connexion
lib/
  db.ts         → SQLite (sessions + favoris)
  auth.ts       → JWT helpers
  iptv.ts       → Client proxy Xtream Codes
components/     → Navbar, Player HLS, Cards, Sidebar
```

## 🔒 Sécurité
- Les credentials IPTV ne transitent JAMAIS côté client
- JWT stocké en cookie httpOnly
- Toutes les URLs de flux sont générées côté serveur
# popi
