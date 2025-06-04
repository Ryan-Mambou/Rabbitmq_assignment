#!/bin/bash

# Script simple pour démarrer l'interface web RabbitMQ
# Institut de physique nucléaire NGI

echo "🚀 Démarrage de l'interface de test RabbitMQ"
echo "============================================"

# Vérifier que Docker est démarré
if ! docker ps >/dev/null 2>&1; then
    echo "❌ Docker n'est pas démarré. Veuillez démarrer Docker Desktop."
    exit 1
fi

# Démarrer RabbitMQ si nécessaire
echo "📦 Vérification du conteneur RabbitMQ..."
if ! docker ps | grep -q rabbitmq-distributed-computing; then
    echo "🔄 Démarrage de RabbitMQ..."
    docker-compose up -d
    echo "⏳ Attente du démarrage de RabbitMQ (10 secondes)..."
    sleep 10
else
    echo "✅ RabbitMQ est déjà démarré"
fi

# Arrêter tous les processus Node.js existants
echo "🛑 Arrêt des processus existants..."
killall node 2>/dev/null || true
sleep 2

# Démarrer le serveur web en arrière-plan
echo "🌐 Démarrage du serveur web..."
npm run start:web &
WEB_PID=$!

# Attendre que le serveur web démarre
sleep 3

# Démarrer quelques workers
echo "👷 Démarrage des workers..."
npm run start:worker:add &
WORKER_ADD_PID=$!

npm run start:worker:sub &
WORKER_SUB_PID=$!

npm run start:worker:mul &
WORKER_MUL_PID=$!

npm run start:worker:div &
WORKER_DIV_PID=$!

# Attendre que les workers se connectent
sleep 3

echo ""
echo "🎉 Interface prête!"
echo "=================="
echo "🌐 Interface web: http://localhost:3000"
echo ""
echo "Fonctionnalités disponibles:"
echo "  📤 Envoyer des calculs"
echo "  📋 Voir les résultats en temps réel"
echo "  📝 Journal d'activité"
echo ""
echo "Workers actifs:"
echo "  ➕ Addition (PID: $WORKER_ADD_PID)"
echo "  ➖ Soustraction (PID: $WORKER_SUB_PID)"
echo "  ✖️  Multiplication (PID: $WORKER_MUL_PID)"
echo "  ➗ Division (PID: $WORKER_DIV_PID)"
echo ""
echo "🔥 Ouvrez votre navigateur sur http://localhost:3000"
echo ""
echo "Pour arrêter: Ctrl+C"

# Fonction de nettoyage
cleanup() {
    echo ""
    echo "🛑 Arrêt de l'interface..."
    kill $WEB_PID $WORKER_ADD_PID $WORKER_SUB_PID $WORKER_MUL_PID $WORKER_DIV_PID 2>/dev/null
    echo "✅ Interface arrêtée"
    exit 0
}

# Intercepter Ctrl+C
trap cleanup SIGINT

# Attendre indéfiniment
echo "✨ Interface en cours d'exécution... (Ctrl+C pour arrêter)"
wait 