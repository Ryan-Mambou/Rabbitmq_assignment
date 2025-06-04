# Dockerfile pour l'application RabbitMQ de calcul distribué
FROM node:18-alpine

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le code source
COPY src/ ./src/
COPY web/ ./web/

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Changer la propriété des fichiers
RUN chown -R nextjs:nodejs /app
USER nextjs

# Exposer le port pour le serveur web
EXPOSE 3000

# Commande par défaut (sera overridée par docker-compose)
CMD ["node", "src/web-server.js"] 