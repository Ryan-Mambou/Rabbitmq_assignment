const config = require("./config");

/**
 * Génère un nombre entier aléatoire entre min et max (inclus)
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Génère des opérandes aléatoires pour les calculs
 */
function generateOperands() {
  return {
    n1: randomInt(config.MIN_OPERAND, config.MAX_OPERAND),
    n2: randomInt(config.MIN_OPERAND, config.MAX_OPERAND),
  };
}

/**
 * Sélectionne un type d'opération au hasard
 */
function getRandomOperation() {
  const operations = config.OPERATIONS;
  return operations[Math.floor(Math.random() * operations.length)];
}

/**
 * Génère un délai aléatoire pour simuler les calculs complexes
 */
function getRandomDelay() {
  return randomInt(config.MIN_WORKER_DELAY, config.MAX_WORKER_DELAY);
}

/**
 * Effectue l'opération mathématique demandée
 */
function performOperation(n1, n2, operation) {
  switch (operation) {
    case "add":
      return n1 + n2;
    case "sub":
      return n1 - n2;
    case "mul":
      return n1 * n2;
    case "div":
      return n2 !== 0 ? n1 / n2 : "Erreur: Division par zéro";
    default:
      throw new Error(`Opération inconnue: ${operation}`);
  }
}

/**
 * Crée une pause asynchrone (utile pour les simulations)
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Formate un timestamp pour l'affichage dans les logs
 */
function formatTimestamp() {
  return new Date().toISOString();
}

/**
 * Affiche un message avec timestamp dans la console
 */
function log(message, data = null) {
  const timestamp = formatTimestamp();
  if (data) {
    console.log(`[${timestamp}] ${message}:`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] ${message}`);
  }
}

module.exports = {
  randomInt,
  generateOperands,
  getRandomOperation,
  getRandomDelay,
  performOperation,
  sleep,
  formatTimestamp,
  log,
};
