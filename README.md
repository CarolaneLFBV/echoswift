# EchoSwift 🦅

Discord bot qui récupère et poste automatiquement les articles de [swift.org](https://www.swift.org/atom.xml) sous forme d'embeds Discord élégants.

## ✨ Caractéristiques

- 📰 Récupération automatique des articles Swift.org (feed Atom)
- ⏰ Vérification 2x/jour (midi et minuit, timezone configurable)
- 🎨 Messages formatés avec embeds Discord
- 🔔 Notifications avec mention de rôle
- 🐳 Conteneurisé avec Docker
- 🚀 CI/CD automatique via GitHub Actions
- 💾 Persistance JSON pour éviter les doublons

## 🛠️ Stack Technique

| Technologie | Version | Usage |
|-------------|---------|-------|
| Bun | 1.1+ | Runtime JavaScript |
| TypeScript | 5.x | Langage |
| discord.js | 14.14+ | SDK Discord |
| rss-parser | 3.13+ | Parser Atom/RSS |
| node-cron | 3.0+ | Scheduler |
| Docker | 24.0+ | Conteneurisation |
| Docker Compose | 2.x | Orchestration |

## 📋 Prérequis

### Développement Local
- [Bun](https://bun.sh/) installé
- Compte Discord avec permissions de créer des bots
- Node.js 20+ (optionnel, si vous n'utilisez pas Bun)

### Production (VPS)
- Docker & Docker Compose installés
- Réseau Traefik configuré (ou créer : `docker network create traefik-network`)
- Ubuntu 25.04 (ou toute distribution Linux avec Docker)

## 🚀 Installation Locale

### 1. Créer le Discord Bot

1. Aller sur [Discord Developer Portal](https://discord.com/developers/applications)
2. Créer une nouvelle application
3. Section **Bot** :
   - Créer un bot
   - Copier le token
   - Activer les intents :
     - ✅ Guilds
     - ✅ Guild Messages
     - ✅ Message Content (si nécessaire)
4. Section **OAuth2 → URL Generator** :
   - Scopes : `bot`
   - Permissions :
     - Send Messages
     - Embed Links
     - Mention Everyone
   - Copier l'URL générée et inviter le bot sur votre serveur

### 2. Cloner et Configurer

```bash
# Cloner le repo
git clone https://github.com/votre-username/swift-feed-bot.git
cd swift-feed-bot

# Installer les dépendances
bun install

# Créer le fichier .env
cp .env.example .env
```

### 3. Configuration (.env)

```env
DISCORD_TOKEN=votre_token_discord
CHANNEL_ID=id_du_channel_discord
ROLE_ID=id_du_role_a_mentionner
FEED_URL=https://www.swift.org/atom.xml
TIMEZONE=Europe/Paris
NODE_ENV=development
```

**Comment obtenir les IDs Discord ?**
- Activer le mode développeur : Paramètres → Avancé → Mode développeur
- Clic droit sur le channel → Copier l'ID
- Clic droit sur le rôle → Copier l'ID

### 4. Lancer le Bot

```bash
# Mode développement (avec hot reload)
bun run dev

# Mode production
bun start

# Tests
bun test

# Tests en mode watch
bun run test:watch
```

## 🐳 Déploiement Docker (Production)

### Option 1 : Build Local

```bash
# Build l'image
docker build -t swift-feed-bot:latest .

# Lancer avec docker-compose
docker compose up -d

# Vérifier les logs
docker logs -f swift-feed-bot
```

### Option 2 : GitHub Container Registry (Recommandé)

Le workflow GitHub Actions build et push automatiquement l'image vers GHCR.

#### Configuration VPS Initial

```bash
# SSH sur votre VPS
ssh ubuntu@votre-vps-ip

# Créer le répertoire projet
sudo mkdir -p /opt/swift-feed-bot
sudo chown $USER:$USER /opt/swift-feed-bot
cd /opt/swift-feed-bot

# Créer docker-compose.yml
nano docker-compose.yml
# (Copier le contenu du fichier docker-compose.yml du repo)

# Créer .env
nano .env
# (Remplir avec vos tokens/IDs)

# Créer le volume data
mkdir -p data
echo "[]" > data/posted-articles.json

# Vérifier que le réseau Traefik existe
docker network ls | grep traefik-network
# Si absent : docker network create traefik-network

# Login GHCR (si image privée)
echo $GITHUB_TOKEN | docker login ghcr.io -u VOTRE_USERNAME --password-stdin

# Démarrer le bot
docker compose up -d

# Vérifier les logs
docker logs -f swift-feed-bot
```

### Mise à Jour Automatique

Le workflow GitHub Actions déploie automatiquement sur le VPS lors d'un push sur `main`.

**Secrets GitHub à configurer** (Settings → Secrets and variables → Actions) :
- `VPS_HOST` : IP ou hostname de votre VPS
- `VPS_USER` : Nom d'utilisateur SSH (ex: ubuntu)
- `VPS_SSH_KEY` : Clé SSH privée pour l'accès

Le bot utilisera automatiquement `GITHUB_TOKEN` pour pusher l'image vers GHCR.

## 📊 Monitoring & Logs

### Logs Docker

```bash
# Logs en temps réel
docker logs -f swift-feed-bot

# Dernières 100 lignes
docker logs --tail 100 swift-feed-bot

# Filtrer les erreurs
docker logs swift-feed-bot 2>&1 | grep -i error
```

### Stats Conteneur

```bash
docker stats swift-feed-bot
```

### Backup Data

```bash
# Backup manuel
docker exec swift-feed-bot cat /app/data/posted-articles.json > backup.json

# Backup automatique (cron)
# Ajouter à crontab -e :
0 3 * * * docker exec swift-feed-bot cp /app/data/posted-articles.json /app/data/backup-$(date +\%Y\%m\%d).json
0 4 * * * find /opt/swift-feed-bot/data/backup-*.json -mtime +30 -delete
```

## 🔧 Configuration Avancée

### Modifier la Fréquence du Scheduler

Éditer `src/scheduler.ts` :

```typescript
// Actuel : '0 12,0 * * *' (midi et minuit)
// Exemples :
// '0 */6 * * *'     // Toutes les 6 heures
// '0 9,12,18 * * *' // 9h, 12h, 18h
// '*/30 * * * *'    // Toutes les 30 minutes (non recommandé)
```

### Personnaliser l'Embed

Éditer `src/discord/embeds.ts` :

```typescript
const SWIFT_ORANGE = 0xF05138; // Couleur
const embed = new EmbedBuilder()
  .setTitle(title)
  .setURL(article.link)
  .setDescription(article.description)
  .setColor(SWIFT_ORANGE)
  .setFooter({ text: `swift.org • Published ${dateStr}` })
  .setTimestamp(article.publishedAt);
```

### Ajouter un Thumbnail/Image

```typescript
.setThumbnail('https://www.swift.org/assets/images/swift.svg')
// ou
.setImage('https://example.com/banner.png')
```

## 🧪 Tests

```bash
# Lancer tous les tests
bun test

# Tests en mode watch
bun run test:watch

# Tests avec coverage (si configuré)
bun test --coverage
```

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Structure du Projet

```
swift-feed-bot/
├── src/
│   ├── index.ts              # Entry point
│   ├── bot.ts                # Discord client
│   ├── config.ts             # Configuration loader
│   ├── scheduler.ts          # Cron scheduler
│   ├── feed/
│   │   ├── fetcher.ts        # HTTP fetcher avec retry
│   │   ├── parser.ts         # Atom XML parser
│   │   └── storage.ts        # JSON persistence
│   └── discord/
│       ├── embeds.ts         # Embed builder
│       └── poster.ts         # Message posting
├── tests/
│   ├── parser.test.ts        # Tests parser
│   └── embeds.test.ts        # Tests embeds
├── data/                     # Volume Docker (persistance)
├── .github/
│   └── workflows/
│       └── deploy.yml        # CI/CD GitHub Actions
├── Dockerfile                # Image multi-stage
├── docker-compose.yml        # Service definition
├── package.json
├── tsconfig.json
└── README.md
```

## 🐛 Troubleshooting

### Le bot ne se connecte pas à Discord

```bash
# Vérifier le token
docker exec swift-feed-bot printenv DISCORD_TOKEN

# Vérifier les logs
docker logs swift-feed-bot | grep -i error
```

### Pas de nouveaux articles postés

```bash
# Vérifier manuellement le feed
curl https://www.swift.org/atom.xml

# Vérifier le storage
docker exec swift-feed-bot cat /app/data/posted-articles.json

# Forcer un check immédiat (en dev)
# Modifier NODE_ENV=development dans .env et redémarrer
```

### Permissions Discord insuffisantes

Le bot nécessite ces permissions :
- Send Messages
- Embed Links
- Mention Everyone

Réinviter le bot avec l'URL OAuth2 mise à jour.

## 📄 License

MIT License - voir [LICENSE](LICENSE) pour plus de détails.

## 👤 Auteur

**Carolan Lefebvre**

- GitHub: [@CarolaneLFBV](https://github.com/CarolaneLFBV)

## 🙏 Remerciements

- [Swift.org](https://www.swift.org/) pour le feed
- [discord.js](https://discord.js.org/) pour le SDK
- [Bun](https://bun.sh/) pour le runtime performant
