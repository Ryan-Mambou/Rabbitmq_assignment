# 🧮 Système de Calcul Distribué RabbitMQ

Système de calcul distribué utilisant RabbitMQ pour traiter des opérations mathématiques avec une interface web en temps réel.

## 🎯 Description

Application permettant d'envoyer des calculs mathématiques (addition, soustraction, multiplication, division) qui sont traités de manière distribuée par des workers spécialisés via RabbitMQ. Les résultats sont affichés en temps réel dans une interface web moderne.

## 📋 Prérequis

- **Docker** et **Docker Compose**
- **Git** (pour cloner le projet)

## ⚡ Installation

### 1. Cloner le projet

```bash
git clone https://github.com/your-username/rabbitmq-distributed-computing.git
cd rabbitmq-distributed-computing
```

### 2. Démarrer l'application

```bash
./docker-start.sh
```

**C'est tout !** 🎉

## 🌐 Accès

- **Interface Web**: http://localhost:3000
- **RabbitMQ Management**: http://localhost:15672 (user/password)

## 💻 Utilisation

1. **Démarrer** : `./docker-start.sh`
2. **Ouvrir** : http://localhost:3000
3. **Tester** : Remplir le formulaire et cliquer "Envoyer"
4. **Observer** : Résultats en temps réel + logs d'activité

### Fonctionnalités

- ✅ Calculs mathématiques (add, sub, mul, div)
- ✅ Option "Toutes les opérations"
- ✅ Calculs aléatoires automatiques
- ✅ Interface temps réel avec WebSocket
- ✅ 8 workers distribués (2 par opération)

## 🐛 Dépannage Rapide

**Problème de port :**

```bash
killall node
./docker-start.sh
```

**Problème Docker :**

```bash
docker-compose down -v --rmi all
./docker-start.sh
```

**Voir les logs :**

```bash
docker-compose logs -f
```

**Arrêter l'application :**

```bash
./docker-stop.sh
```

## 🎯 Architecture

Le script `docker-start.sh` démarre automatiquement :

- **1 RabbitMQ Server** (broker de messages)
- **1 Web Server** (interface sur port 3000)
- **8 Workers** (2 par opération : add, sub, mul, div)

Tout est containerisé et orchestré avec Docker Compose.

## 🔧 Pour les Développeurs

**Démarrage manuel (développement seulement) :**

```bash
npm install
docker-compose up -d rabbitmq
./scripts/start-interface.sh
```

**Commandes utiles :**

```bash
docker-compose ps                    # État des services
docker-compose logs -f web-server    # Logs serveur web
npm test                            # Tests
```

---

**🎉 Installation en 2 commandes : `git clone` + `./docker-start.sh` !**
