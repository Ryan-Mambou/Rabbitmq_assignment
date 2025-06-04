#!/bin/bash

# Script pour démarrer l'application RabbitMQ avec Docker Compose
# Institut de physique nucléaire NGI

echo "🐳 Démarrage de l'application RabbitMQ avec Docker"
echo "=================================================="

# Vérifier que Docker est démarré
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker n'est pas démarré. Veuillez démarrer Docker Desktop."
    exit 1
fi

# Arrêter et nettoyer les conteneurs existants
echo "🛑 Nettoyage des conteneurs existants..."
docker-compose down

# Construire les images et démarrer les services
echo "🔨 Construction des images Docker..."
docker-compose build

echo "🚀 Démarrage des services..."
docker-compose up -d

# Attendre que les services soient prêts
echo "⏳ Attente du démarrage des services..."
sleep 15

# Vérifier le statut des services
echo "📊 Vérification du statut des services..."
docker-compose ps

echo ""
echo "🎉 Application démarrée avec succès!"
echo "==================================="
echo ""
echo "🌐 Interface Web: http://localhost:3000"
echo "🐰 RabbitMQ Management: http://localhost:15672"
echo "   Credentials: user/password"
echo ""
echo "Services démarrés:"
echo "  - RabbitMQ Server"
echo "  - Web Server (Interface utilisateur)"
echo "  - 2 Workers Addition"
echo "  - 2 Workers Soustraction"
echo "  - 2 Workers Multiplication"
echo "  - 2 Workers Division"
echo ""
echo "Commands utiles:"
echo "  docker-compose logs -f              # Voir tous les logs"
echo "  docker-compose logs -f web-server   # Logs du serveur web"
echo "  docker-compose logs -f worker-add   # Logs des workers addition"
echo "  docker-compose ps                   # État des services"
echo "  docker-compose down                 # Arrêter l'application"
echo ""
echo "🎯 Ouvrez votre navigateur sur http://localhost:3000 pour tester!" 