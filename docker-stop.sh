#!/bin/bash

# Script pour arrêter l'application RabbitMQ Docker
# Institut de physique nucléaire NGI

echo "🛑 Arrêt de l'application RabbitMQ Docker"
echo "========================================="

# Arrêter tous les services
echo "🔄 Arrêt des services..."
docker-compose down

echo "🧹 Nettoyage des images inutilisées..."
docker image prune -f

echo "📊 État final:"
docker-compose ps

echo ""
echo "✅ Application arrêtée avec succès!"
echo "🗑️  Pour nettoyer complètement (supprimer volumes et images):"
echo "   docker-compose down -v --rmi all" 