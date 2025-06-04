// Configuration du système de calcul distribué avec RabbitMQ
const config = {
  // URL de connexion au serveur RabbitMQ (Docker ou local)
  RABBITMQ_URL:
    process.env.RABBITMQ_URL || "amqp://user:password@rabbitmq:5672",

  // Noms des files d'attente pour chaque type d'opération
  QUEUES: {
    RESULTS: "calculation_results",
    ADD: "add_tasks",
    SUB: "sub_tasks",
    MUL: "mul_tasks",
    DIV: "div_tasks",
  },

  // Exchange pour le routage des messages
  EXCHANGE: "calculation_exchange",

  // Paramètres de simulation du système
  PRODUCER_INTERVAL: 3000, // Envoie une requête toutes les 3 secondes
  MIN_WORKER_DELAY: 5000, // Délai minimum de traitement (5 secondes)
  MAX_WORKER_DELAY: 15000, // Délai maximum de traitement (15 secondes)

  // Types d'opérations supportées par le système
  OPERATIONS: ["add", "sub", "mul", "div", "all"],

  // Plage de valeurs pour les opérandes aléatoires
  MIN_OPERAND: 1,
  MAX_OPERAND: 100,
};

module.exports = config;
